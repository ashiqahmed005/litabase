jest.mock('nodemailer');

const nodemailer = require('nodemailer');

// Set up the transporter mock before emailer is required so the singleton
// is initialised with our mock on the first getTransporter() call.
const sendMail = jest.fn().mockResolvedValue({});
nodemailer.createTransport.mockReturnValue({ sendMail });

const { sendReport, resultsToCsv } = require('../../src/services/emailer');

beforeEach(() => sendMail.mockClear());

// ─── sendReport ──────────────────────────────────────────────────────────────

describe('sendReport()', () => {
  it('calls sendMail with the correct subject and html', async () => {
    await sendReport({ to: ['a@b.com'], subject: 'Test', html: '<p>hi</p>' });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Test', html: '<p>hi</p>' })
    );
  });

  it('joins an array of recipients into a comma-separated string', async () => {
    await sendReport({ to: ['a@b.com', 'c@d.com'], subject: 'S', html: 'H' });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@b.com, c@d.com' })
    );
  });

  it('passes a string recipient through unchanged', async () => {
    await sendReport({ to: 'solo@b.com', subject: 'S', html: 'H' });
    expect(sendMail.mock.calls[0][0].to).toBe('solo@b.com');
  });

  it('attaches a CSV when csvAttachment is provided', async () => {
    await sendReport({
      to: 'a@b.com', subject: 'S', html: 'H',
      csvAttachment: { filename: 'report.csv', content: 'a,b\n1,2' },
    });
    const { attachments } = sendMail.mock.calls[0][0];
    expect(attachments).toHaveLength(1);
    expect(attachments[0].filename).toBe('report.csv');
    expect(attachments[0].contentType).toBe('text/csv');
  });

  it('sends no attachments when csvAttachment is omitted', async () => {
    await sendReport({ to: 'a@b.com', subject: 'S', html: 'H' });
    expect(sendMail.mock.calls[0][0].attachments).toHaveLength(0);
  });
});

// ─── resultsToCsv ─────────────────────────────────────────────────────────────

describe('resultsToCsv()', () => {
  it('produces a header row followed by data rows', () => {
    expect(resultsToCsv(['id', 'name'], [['1', 'Alice'], ['2', 'Bob']]))
      .toBe('id,name\n1,Alice\n2,Bob');
  });

  it('wraps values containing commas in double-quotes', () => {
    expect(resultsToCsv(['name'], [['Smith, John']])).toContain('"Smith, John"');
  });

  it('escapes double-quotes inside values by doubling them', () => {
    expect(resultsToCsv(['val'], [['"quoted"']])).toContain('"""quoted"""');
  });

  it('wraps values containing newlines in double-quotes', () => {
    expect(resultsToCsv(['notes'], [['line1\nline2']])).toContain('"line1\nline2"');
  });

  it('renders null and undefined as empty string', () => {
    expect(resultsToCsv(['a', 'b'], [[null, undefined]])).toBe('a,b\n,');
  });

  it('returns only the header when rows is empty', () => {
    expect(resultsToCsv(['x', 'y'], [])).toBe('x,y');
  });
});
