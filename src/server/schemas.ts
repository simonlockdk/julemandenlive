/**
 * Valideringsskemaer for alle redigerbare datafiler. Intet skrives til disk,
 * før det har passeret disse skemaer – det gælder både admin og håndredigering
 * (ugyldige filer ved opstart afvises med en tydelig fejl i loggen, og
 * standardværdierne bruges i stedet).
 */
import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9][a-z0-9-_]{0,47}$/, 'Kun små bogstaver, tal, - og _');
const text = (max = 2000) => z.string().max(max);
const hm = z.string().regex(/^\d{1,2}:\d{2}$/, 'Klokkeslæt skal være TT:MM');
const dkLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Dato skal være ÅÅÅÅ-MM-DDTTT:MM');
const lat = z.number().min(-90).max(90);
const lon = z.number().min(-180).max(180);

/** Tillader relative stier (/media/…) og https-URL'er – aldrig javascript: o.l. */
export const safeUrl = z
  .string()
  .max(1000)
  .refine((u) => /^\/(?!\/)[\w\-./%]*$/.test(u) || /^https:\/\/[\w.-]+(:\d+)?\/[\w\-./%?=&]*$/.test(u), {
    message: 'URL skal være en relativ sti (/media/…) eller en https-adresse',
  });

/* ---------------- tracking ---------------- */

const city = z.object({
  name: text(80).min(1),
  country: text(80).optional(),
  lat,
  lon,
  tz: text(64).optional(),
  note: text(300).optional(),
});

export const trackingSchema = z.object({
  homeBase: z.object({ name: text(80), lat, lon }),
  testFlightSpeedKmh: z.number().min(100).max(1_000_000),
  testStopMinutes: z.number().min(0).max(120),
  christmas: z.object({
    enabled: z.boolean(),
    localTargetTime: hm,
    bandMinutes: z.number().min(10).max(240),
    stopMinutes: z.number().min(0).max(30),
    cities: z.array(city).max(500),
  }),
  autoTestFlights: z.object({
    enabled: z.boolean(),
    seed: text(60),
    periods: z
      .array(
        z.object({
          from: z.string().regex(/^\d{2}-\d{2}$/),
          to: z.string().regex(/^\d{2}-\d{2}$/),
          weekdays: z.array(z.number().int().min(0).max(6)).optional(),
          chance: z.number().min(0).max(1).optional(),
          windowStart: hm,
          windowEnd: hm,
          minStops: z.number().int().min(1).max(10),
          maxStops: z.number().int().min(1).max(10),
        }),
      )
      .max(20),
    cityPool: z.array(city).max(200),
  }),
  scheduledFlights: z
    .array(
      z.object({
        id,
        title: text(120).min(1),
        description: text(500).optional(),
        start: dkLocal,
        speedKmh: z.number().min(100).max(1_000_000).optional(),
        stopMinutes: z.number().min(0).max(120).optional(),
        stops: z.array(city).min(1).max(30),
        enabled: z.boolean(),
        type: z.enum(['test', 'special']).optional(),
      }),
    )
    .max(200),
  cancelledAutoDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(400),
});

/* ---------------- kameraer ---------------- */

export const SCENES = ['workshop', 'stable', 'garage', 'packing', 'yard', 'office', 'training', 'secret'] as const;
export const EVENT_TYPES = ['nisse-runs', 'lights-out', 'gift-falls', 'reindeer-closeup', 'signal-loss', 'tech-glitch', 'clip'] as const;

export const cameraSchema = z.object({
  id,
  channel: z.number().int().min(1).max(64),
  name: text(80).min(1),
  location: text(80),
  description: text(500),
  status: z.enum(['online', 'offline', 'maintenance']),
  source: z.object({
    type: z.enum(['scene', 'mp4', 'hls']),
    url: safeUrl.optional(),
    scene: z.enum(SCENES).optional(),
  }),
  poster: safeUrl.optional(),
  loop: z.boolean(),
  /** Fallback-scene, hvis videoen mangler eller fejler */
  fallbackScene: z.enum(SCENES).optional(),
  events: z.object({
    enabled: z.boolean(),
    perHour: z.number().min(0).max(120),
    types: z.array(z.enum(EVENT_TYPES)).max(10),
    clips: z.array(z.object({ src: safeUrl, label: text(80).optional(), durationMs: z.number().min(500).max(120_000).optional() })).max(20).optional(),
  }),
});

export const camerasSchema = z.object({
  cameras: z.array(cameraSchema).max(32).refine((cams) => new Set(cams.map((c) => c.id)).size === cams.length, 'Kamera-id skal være unikke'),
});

/* ---------------- driftsstatus ---------------- */

export const statusSchema = z.object({
  overrides: z.record(z.string().max(40), text(80)),
  messages: z
    .array(
      z.object({
        id,
        text: text(300).min(1),
        level: z.enum(['info', 'ok', 'warn']),
        start: dkLocal.optional(),
        end: dkLocal.optional(),
      }),
    )
    .max(50),
});

/* ---------------- begivenheder ---------------- */

export const eventsSchema = z.object({
  events: z
    .array(
      z.object({
        id,
        type: z.enum(['banner', 'grounded', 'snowstorm', 'aurora', 'celebration']),
        title: text(120).min(1),
        message: text(500),
        start: dkLocal,
        end: dkLocal,
        enabled: z.boolean(),
      }),
    )
    .max(100),
});

/* ---------------- julekalender ---------------- */

export const DOOR_TYPES = ['story', 'riddle', 'tradition', 'game', 'animation', 'message', 'video', 'quiz'] as const;

export const doorSchema = z.object({
  day: z.number().int().min(1).max(24),
  type: z.enum(DOOR_TYPES),
  title: text(120).min(1),
  body: text(6000).optional(),
  question: text(500).optional(),
  answer: text(500).optional(),
  options: z.array(text(200)).max(6).optional(),
  correct: z.number().int().min(0).max(5).optional(),
  game: z.enum(['memory', 'catch', 'snowman']).optional(),
  animation: z.enum(['snowglobe', 'fireworks', 'dance', 'aurora']).optional(),
  videoUrl: safeUrl.optional(),
  poster: safeUrl.optional(),
  from: text(80).optional(),
});

export const calendarSchema = z.object({
  doors: z
    .array(doorSchema)
    .length(24)
    .refine((d) => new Set(d.map((x) => x.day)).size === 24, 'Der skal være præcis én låge for hver dag 1-24'),
});

/* ---------------- tekster og sektioner ---------------- */

export const siteSchema = z.object({
  title: text(80),
  tagline: text(200),
  heroTitle: text(120),
  heroText: text(600),
  footerText: text(600),
  banner: z.object({ enabled: z.boolean(), text: text(300), level: z.enum(['info', 'ok', 'warn']) }),
  sections: z.object({
    countdowns: z.boolean(),
    advent: z.boolean(),
    status: z.boolean(),
    logbook: z.boolean(),
    weather: z.boolean(),
    fact: z.boolean(),
    nvrPreview: z.boolean(),
    journal: z.boolean(),
  }),
  features: z.object({
    snow: z.boolean(),
    nisseAlarm: z.boolean(),
    hiddenNisser: z.boolean(),
  }),
});

export const SCHEMAS = {
  site: siteSchema,
  cameras: camerasSchema,
  tracking: trackingSchema,
  status: statusSchema,
  events: eventsSchema,
  calendar: calendarSchema,
} as const;

export type DataName = keyof typeof SCHEMAS;
export type DataOf<N extends DataName> = z.infer<(typeof SCHEMAS)[N]>;
export const DATA_NAMES = Object.keys(SCHEMAS) as DataName[];

export function formatZodError(err: z.ZodError): string[] {
  return err.issues.slice(0, 20).map((i) => `${i.path.join('.') || '(rod)'}: ${i.message}`);
}
