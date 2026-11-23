import { buildApp } from './app';
import { loadConfig } from './config';

const cfg = loadConfig();
const app = await buildApp();

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Lukker ned');
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

try {
  await app.listen({ host: cfg.host, port: cfg.port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
