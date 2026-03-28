const app       = require('./app');
const { migrate } = require('./db');
const scheduler = require('./services/scheduler');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await migrate();
    await scheduler.loadAndStartAll();
    app.listen(PORT, () => console.log(`Litabase backend running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
