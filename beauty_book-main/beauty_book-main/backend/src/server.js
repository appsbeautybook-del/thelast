import { createApp } from './app.js';
import { missingConfiguration } from './config/env.js';
const missing = missingConfiguration();
if (process.env.NODE_ENV === 'production' && missing.length) throw new Error('Backend configuration missing: ' + missing.join(', '));
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const server = createApp().listen(port, host, () => {
  console.log(`BeautyBook API listening on http://${host}:${port}; configured=${missing.length === 0}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
