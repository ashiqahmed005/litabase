const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendReport({ to, subject, html, csvAttachment }) {
  const t = getTransporter();
  const attachments = [];

  if (csvAttachment) {
    attachments.push({
      filename: csvAttachment.filename,
      content: csvAttachment.content,
      contentType: 'text/csv',
    });
  }

  await t.sendMail({
    from: process.env.EMAIL_FROM,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    attachments,
  });
}

function resultsToCsv(columns, rows) {
  const header = columns.join(',');
  const lines = rows.map(row =>
    row.map(cell => {
      if (cell === null || cell === undefined) return '';
      const str = String(cell);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  return [header, ...lines].join('\n');
}

module.exports = { sendReport, resultsToCsv };
