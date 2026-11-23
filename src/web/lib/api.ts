import type { DataOf } from '../../server/schemas';
import type { FlightPlan } from '@shared/tracking';

export type Site = DataOf<'site'>;
export type Camera = DataOf<'cameras'>['cameras'][number];
export type CalendarDoor = DataOf<'calendar'>['doors'][number];
export type SiteEvent = DataOf<'events'>['events'][number] & { startMs: number; endMs: number };
export type StatusMessage = DataOf<'status'>['messages'][number];

export interface Bootstrap {
  now: number;
  serverNow: number;
  tz: string;
  timeMachine: { allowed: boolean; active: boolean };
  site: Site;
  events: SiteEvent[];
  status: { overrides: Record<string, string>; messages: StatusMessage[] };
  cameras: Camera[];
  homeBase: { name: string; lat: number; lon: number };
}

export interface TrackingResponse {
  now: number;
  homeBase: { name: string; lat: number; lon: number };
  flights: FlightPlan[];
}

export interface JournalFlight {
  id: string;
  type: string;
  title: string;
  description?: string;
  start: number;
  end: number;
  inProgress: boolean;
  distanceKm: number;
  stops: string[];
  condition: string;
  landingScore: string;
}

export type PublicDoor = ({ locked: false } & CalendarDoor) | { day: number; locked: true };

/** Tidsmaskine: tidsstempel (ms), der sendes med som ?t= til serveren. */
let timeMachineT: number | null = null;
export function setTimeMachineParam(t: number | null) {
  timeMachineT = t;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public issues?: string[]) {
    super(message);
  }
}

function withT(path: string): string {
  if (timeMachineT === null || !path.startsWith('/api/') || path.startsWith('/api/admin')) return path;
  return path + (path.includes('?') ? '&' : '?') + 't=' + timeMachineT;
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(withT(path), { credentials: 'same-origin', signal, headers: { accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? `Fejl ${res.status}`, body.issues);
  }
  return res.json() as Promise<T>;
}

export async function apiSend<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
      'x-nordpolen': '1',
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Fejl ${res.status}`, data.issues);
  return data as T;
}
