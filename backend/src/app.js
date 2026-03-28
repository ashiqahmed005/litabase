require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { AppError } = require('./errors/AppError');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/queries',     require('./routes/queries'));
app.use('/api/dashboards',  require('./routes/dashboards'));
app.use('/api/schedules',   require('./routes/schedules'));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend')));
  app.get('*', (_req, res) =>
    res.sendFile(path.join(__dirname, '../../frontend/index.html'))
  );
}

// Global error handler — must have exactly 4 parameters for Express to treat it as an error handler.
// Operational errors (AppError subclasses) get their own status code; everything else is a 500.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
