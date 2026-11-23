/**
 * Simpel, robust JSON-lagring.
 * - Hver datafil valideres med zod ved indlæsning og ved skrivning.
 * - Skrivninger er atomiske (tmp-fil + rename), og forrige version gemmes
 *   som <navn>.prev.json, så en fejl altid kan rulles tilbage i hånden.
 * - Mangler en fil, oprettes den fra standardværdierne.
 * - Er en fil ugyldig (fx efter håndredigering), logges fejlen, og
 *   standardværdierne bruges, indtil filen er rettet – siden går aldrig ned.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_NAMES, SCHEMAS, formatZodError, type DataName, type DataOf } from './schemas';
import defaultSite from './defaults/site.json';
import defaultCameras from './defaults/cameras.json';
import defaultTracking from './defaults/tracking.json';
import defaultStatus from './defaults/status.json';
import defaultEvents from './defaults/events.json';
import defaultCalendar from './defaults/calendar.json';

export const DEFAULTS: { [N in DataName]: unknown } = {
  site: defaultSite,
  cameras: defaultCameras,
  tracking: defaultTracking,
  status: defaultStatus,
  events: defaultEvents,
  calendar: defaultCalendar,
};

export class ValidationError extends Error {
  constructor(public issues: string[]) {
    super('Valideringsfejl');
  }
}

type Logger = { warn: (o: unknown, msg?: string) => void; info: (o: unknown, msg?: string) => void };

export class DataStore {
  private cache = new Map<DataName, unknown>();
  private writing = new Map<DataName, Promise<void>>();
  private version = 0;

  constructor(private dir: string, private log: Logger = console as unknown as Logger) {}

  async init(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    for (const name of DATA_NAMES) await this.load(name);
  }

  /** Stiger ved hver skrivning – bruges til ETag/cache. */
  get rev(): number {
    return this.version;
  }

  private file(name: DataName) {
    return path.join(this.dir, `${name}.json`);
  }

  private async load(name: DataName): Promise<void> {
    const file = this.file(name);
    let raw: string | null = null;
    try {
      raw = await fs.readFile(file, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    if (raw === null) {
      const def = SCHEMAS[name].parse(DEFAULTS[name]);
      await this.writeFile(name, def);
      this.cache.set(name, def);
      this.log.info({ name }, 'Oprettede datafil fra standardværdier');
      return;
    }
    try {
      const parsed = SCHEMAS[name].safeParse(JSON.parse(raw));
      if (!parsed.success) throw new ValidationError(formatZodError(parsed.error));
      this.cache.set(name, parsed.data);
    } catch (e) {
      const issues = e instanceof ValidationError ? e.issues : [(e as Error).message];
      this.log.warn({ name, issues }, 'Ugyldig datafil – bruger standardværdier, indtil den er rettet');
      this.cache.set(name, SCHEMAS[name].parse(DEFAULTS[name]));
    }
  }

  get<N extends DataName>(name: N): DataOf<N> {
    return this.cache.get(name) as DataOf<N>;
  }

  /** Validerer og gemmer. Kaster ValidationError ved ugyldige data. */
  async set<N extends DataName>(name: N, value: unknown): Promise<DataOf<N>> {
    const parsed = SCHEMAS[name].safeParse(value);
    if (!parsed.success) throw new ValidationError(formatZodError(parsed.error));
    // serialiser skrivninger pr. fil
    const prev = this.writing.get(name) ?? Promise.resolve();
    const job = prev.then(() => this.writeFile(name, parsed.data, true));
    this.writing.set(name, job.catch(() => undefined));
    await job;
    this.cache.set(name, parsed.data);
    this.version++;
    return parsed.data as DataOf<N>;
  }

  private async writeFile(name: DataName, data: unknown, keepPrev = false): Promise<void> {
    const file = this.file(name);
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2) + '\n', { mode: 0o640 });
    if (keepPrev) {
      await fs.copyFile(file, path.join(this.dir, `${name}.prev.json`)).catch(() => undefined);
    }
    await fs.rename(tmp, file);
  }
}
