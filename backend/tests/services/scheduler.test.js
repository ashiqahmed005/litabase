jest.mock('node-cron');
jest.mock('../../src/repositories/scheduleRepository');
jest.mock('../../src/services/queryRunner');
jest.mock('../../src/services/emailer');

const cron         = require('node-cron');
const scheduleRepo = require('../../src/repositories/scheduleRepository');
const { runQuery } = require('../../src/services/queryRunner');
const { sendReport, resultsToCsv } = require('../../src/services/emailer');
const { loadAndStartAll, startSchedule, stopSchedule, runSchedule } = require('../../src/services/scheduler');

const mockTask = { stop: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  cron.validate.mockReturnValue(true);
  cron.schedule.mockReturnValue(mockTask);
  resultsToCsv.mockReturnValue('col\nval');
  sendReport.mockResolvedValue(undefined);
});

// ─── loadAndStartAll ──────────────────────────────────────────────────────────

describe('loadAndStartAll()', () => {
  it('starts a cron task for each active schedule', async () => {
    scheduleRepo.findAllActive.mockResolvedValue([
      { id: '1', cron_expression: '* * * * *', name: 'S1' },
      { id: '2', cron_expression: '0 9 * * 1', name: 'S2' },
    ]);

    await loadAndStartAll();

    expect(cron.schedule).toHaveBeenCalledTimes(2);
  });

  it('handles an empty active schedule list without throwing', async () => {
    scheduleRepo.findAllActive.mockResolvedValue([]);
    await expect(loadAndStartAll()).resolves.not.toThrow();
  });
});

// ─── startSchedule ────────────────────────────────────────────────────────────

describe('startSchedule()', () => {
  it('registers a new cron task for a valid expression', () => {
    startSchedule({ id: 'a', cron_expression: '* * * * *', name: 'A' });
    expect(cron.schedule).toHaveBeenCalledTimes(1);
  });

  it('stops any existing task before creating a replacement', () => {
    const schedule = { id: 'dup', cron_expression: '* * * * *', name: 'D' };
    startSchedule(schedule);
    startSchedule(schedule); // second call should stop the first
    expect(mockTask.stop).toHaveBeenCalledTimes(1);
    expect(cron.schedule).toHaveBeenCalledTimes(2);
  });

  it('does not register a task when the cron expression is invalid', () => {
    cron.validate.mockReturnValue(false);
    startSchedule({ id: 'bad', cron_expression: 'not-a-cron', name: 'B' });
    expect(cron.schedule).not.toHaveBeenCalled();
  });
});

// ─── stopSchedule ─────────────────────────────────────────────────────────────

describe('stopSchedule()', () => {
  it('stops and removes a running task', () => {
    startSchedule({ id: 'x', cron_expression: '* * * * *', name: 'X' });
    stopSchedule('x');
    expect(mockTask.stop).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for an unknown schedule id', () => {
    expect(() => stopSchedule('does-not-exist')).not.toThrow();
  });
});

// ─── runSchedule ──────────────────────────────────────────────────────────────

const sched = { id: 's1', name: 'Weekly Report', dashboard_id: 'd1', dashboard_name: 'Sales', recipients: ['a@b.com'] };

const widget = {
  id: 'w1', title: 'Revenue', query_name: 'rev_query', sql_text: 'SELECT 1',
  type: 'postgres', host: 'localhost', port: 5432,
  database_name: 'db', username: 'user', password_encrypted: null, ssl_enabled: false,
};

describe('runSchedule()', () => {
  it('runs each widget query and sends a report', async () => {
    scheduleRepo.findWidgetsForDashboard.mockResolvedValue([widget]);
    runQuery.mockResolvedValue({ columns: ['rev'], rows: [['100']], rowCount: 1 });

    await runSchedule(sched);

    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(sendReport).toHaveBeenCalledTimes(1);
    expect(scheduleRepo.markLastRun).toHaveBeenCalledWith('s1');
  });

  it('passes recipient list and schedule name as email subject', async () => {
    scheduleRepo.findWidgetsForDashboard.mockResolvedValue([widget]);
    runQuery.mockResolvedValue({ columns: [], rows: [], rowCount: 0 });

    await runSchedule(sched);

    const call = sendReport.mock.calls[0][0];
    expect(call.to).toEqual(['a@b.com']);
    expect(call.subject).toBe('Report: Weekly Report');
  });

  it('continues with remaining widgets when one query fails', async () => {
    const w2 = { ...widget, id: 'w2', title: 'Errors' };
    scheduleRepo.findWidgetsForDashboard.mockResolvedValue([widget, w2]);
    runQuery
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ columns: ['n'], rows: [['1']], rowCount: 1 });

    await runSchedule(sched);

    expect(runQuery).toHaveBeenCalledTimes(2);
    expect(sendReport).toHaveBeenCalledTimes(1); // still sends the report
  });

  it('HTML-escapes the dashboard name against XSS', async () => {
    scheduleRepo.findWidgetsForDashboard.mockResolvedValue([]);
    const xssSched = { ...sched, dashboard_name: '<script>alert(1)</script>' };

    await runSchedule(xssSched);

    const html = sendReport.mock.calls[0][0].html;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('HTML-escapes widget titles against XSS', async () => {
    const evilWidget = { ...widget, title: '<img onerror="x">' };
    scheduleRepo.findWidgetsForDashboard.mockResolvedValue([evilWidget]);
    runQuery.mockResolvedValue({ columns: ['c'], rows: [['v']], rowCount: 1 });

    await runSchedule(sched);

    const html = sendReport.mock.calls[0][0].html;
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('HTML-escapes cell values against XSS', async () => {
    scheduleRepo.findWidgetsForDashboard.mockResolvedValue([widget]);
    runQuery.mockResolvedValue({
      columns: ['val'],
      rows:    [['<b>bold</b>']],
      rowCount: 1,
    });

    await runSchedule(sched);

    const html = sendReport.mock.calls[0][0].html;
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('does not throw when no widgets are found', async () => {
    scheduleRepo.findWidgetsForDashboard.mockResolvedValue([]);
    await expect(runSchedule(sched)).resolves.not.toThrow();
  });

  it('attaches a CSV file named after the schedule', async () => {
    scheduleRepo.findWidgetsForDashboard.mockResolvedValue([widget]);
    runQuery.mockResolvedValue({ columns: ['x'], rows: [['1']], rowCount: 1 });

    await runSchedule({ ...sched, name: 'My Report' });

    const { csvAttachment } = sendReport.mock.calls[0][0];
    expect(csvAttachment.filename).toBe('My_Report.csv');
  });
});
