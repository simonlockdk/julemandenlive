import path from 'node:path';

const env = process.env;
const isProd = env.NODE_ENV === 'production';

export interface ServerConfig {
  isProd: boolean;
  host: string;
  port: number;
  dataDir: string;
  mediaDir: string;
  webDir: string;
  adminUser: string;
  /** scrypt-hash i formatet scrypt$N$r$p$salt$hash (base64) */
  adminPasswordHash: string;
  cookieSecure: boolean;
  sessionHours: number;
  /** Tillad ?t=… tidsmaskine for alle (kun til udvikling) */
  timeMachineForAll: boolean;
  maxUploadMb: number;
  /** Ekstra kilder til video (fx en CDN til HLS), mellemrumssepareret */
  extraMediaSrc: string;
}

export function loadConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  const root = process.cwd();
  return {
    isProd,
    host: env.HOST ?? '127.0.0.1',
    port: Number(env.PORT ?? 3200),
    dataDir: path.resolve(env.DATA_DIR ?? path.join(root, 'data')),
    mediaDir: path.resolve(env.MEDIA_DIR ?? path.join(root, 'media')),
    webDir: path.resolve(env.WEB_DIR ?? path.join(root, 'dist', 'web')),
    adminUser: env.ADMIN_USER ?? 'julemanden',
    adminPasswordHash: (env.ADMIN_PASSWORD_HASH ?? '').trim().replace(/^(['"])(.*)\1$/, '$2'),
    cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd,
    sessionHours: Number(env.SESSION_HOURS ?? 8),
    timeMachineForAll: env.TIME_MACHINE_FOR_ALL ? env.TIME_MACHINE_FOR_ALL === 'true' : !isProd,
    maxUploadMb: Number(env.MAX_UPLOAD_MB ?? 1024),
    extraMediaSrc: env.EXTRA_MEDIA_SRC ?? '',
    ...overrides,
  };
}
