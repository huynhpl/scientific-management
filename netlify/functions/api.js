const serverless = require('serverless-http');
const { init } = require('../../backend/src/database');
const app = require('../../backend/src/app');

const handler = serverless(app);
let dbReady = false;

module.exports.handler = async (event, context) => {
  // Initialize DB once per cold start
  if (!dbReady) {
    await init();
    dbReady = true;
  }

  // Netlify strips /api prefix when using "to = /.netlify/functions/api/:splat"
  // Restore it so Express routes match correctly
  if (event.path && !event.path.startsWith('/api')) {
    event.path = '/api' + event.path;
    if (event.rawPath) event.rawPath = event.path;
  }

  return handler(event, context);
};
