import { useState } from 'react';
import { apiGet } from '../../lib/api';
import { useAdminData, slugId } from '../useAdminData';
import { Field, Loading, SaveBar, Section, Toggle, updateAt } from './common';
import { IconPlus, IconTrash } from '../../components/Icons';
import type { CityDef, ScheduledFlight, TrackingConfig } from '@shared/tracking';

/** "København" eller "Mit sted; 55.1; 12.3" pr. linje → byliste. */
function parseStops(text: string, known: CityDef[]): { stops: CityDef[]; errors: string[] } {
  const errors: string[] = [];
  const stops: CityDef[] = [];
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const parts = line.split(';').map((p) => p.trim());
      if (parts.length >= 3) {
        const lat = Number(parts[1]!.replace(',', '.'));
        const lon = Number(parts[2]!.replace(',', '.'));
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
          errors.push(`Linje ${i + 1}: ugyldige koordinater`);
          return;
        }
        stops.push({ name: parts[0]!, lat, lon });
        return;
      }
      const k = known.find((c) => c.name.toLowerCase() === parts[0]!.toLowerCase());
      if (!k) errors.push(`Linje ${i + 1}: "${parts[0]}" er ikke en kendt by – skriv "Navn; breddegrad; længdegrad"`);
      else stops.push({ name: k.name, country: k.country, lat: k.lat, lon: k.lon, tz: k.tz });
    });
  return { stops, errors };
}

function stopsToText(stops: CityDef[], known: CityDef[]): string {
  return stops.map((s) => (known.some((k) => k.name === s.name && k.lat === s.lat && k.lon === s.lon) ? s.name : `${s.name}; ${s.lat}; ${s.lon}`)).join('\n');
}

function FlightCard({ f, known, onChange, onRemove }: { f: ScheduledFlight; known: CityDef[]; onChange: (p: Partial<ScheduledFlight>) => void; onRemove: () => void }) {
  const [text, setText] = useState(() => stopsToText(f.stops, known));
  const [errors, setErrors] = useState<string[]>([]);
  return (
    <div className="flight-card">
      <div className="form-grid">
        <Field label="Titel" id={`ft-${f.id}`}>
          <input id={`ft-${f.id}`} className="input" value={f.title} onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
        <Field label="Start (dansk tid)" id={`fs-${f.id}`}>
          <input id={`fs-${f.id}`} className="input" type="datetime-local" value={f.start} onChange={(e) => onChange({ start: e.target.value })} />
        </Field>
        <Field label="Type" id={`fy-${f.id}`}>
          <select id={`fy-${f.id}`} className="select" value={f.type ?? 'test'} onChange={(e) => onChange({ type: e.target.value as 'test' | 'special' })}>
            <option value="test">Prøveflyvning</option>
            <option value="special">Særlig begivenhed</option>
          </select>
        </Field>
        <Field label="Fart (km/t, valgfri)" id={`fv-${f.id}`}>
          <input id={`fv-${f.id}`} className="input" type="number" min={100} value={f.speedKmh ?? ''} onChange={(e) => onChange({ speedKmh: e.target.value ? Number(e.target.value) : undefined })} />
        </Field>
      </div>
      <Field label="Beskrivelse" id={`fd-${f.id}`}>
        <input id={`fd-${f.id}`} className="input" value={f.description ?? ''} onChange={(e) => onChange({ description: e.target.value || undefined })} />
      </Field>
      <Field label="Rute – én by pr. linje" hint='Kendte byer kan skrives med navn (fx "Aarhus"). Andre steder: "Navn; breddegrad; længdegrad". Kanen starter og lander altid på Nordpolen.' id={`fr-${f.id}`}>
        <textarea
          id={`fr-${f.id}`}
          className="textarea"
          rows={4}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const r = parseStops(e.target.value, known);
            setErrors(r.errors);
            if (!r.errors.length && r.stops.length) onChange({ stops: r.stops });
          }}
        />
      </Field>
      {errors.length > 0 && (
        <ul className="issues">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="row-actions">
        <Toggle checked={f.enabled} onChange={(v) => onChange({ enabled: v })} label="Aktiv" />
        <a className="btn btn-small" href={`/?tid=${f.start}`} target="_blank" rel="noopener noreferrer">
          Se i tidsmaskinen
        </a>
        <button type="button" className="btn btn-small danger" onClick={onRemove}>
          <IconTrash /> Slet
        </button>
      </div>
    </div>
  );
}

interface PreviewStop {
  name: string;
  country?: string;
  kind: string;
  local: string;
  dk: string;
}

export function FlightsEditor() {
  const { data, setData, loadError, persist, save, dirty, load } = useAdminData('tracking');
  const [preview, setPreview] = useState<PreviewStop[] | null>(null);
  const [previewYear, setPreviewYear] = useState(new Date().getFullYear());
  if (!data) return <Loading error={loadError} />;
  const cfg = data as unknown as TrackingConfig;
  const known = [...cfg.christmas.cities, ...cfg.autoTestFlights.cityPool];
  const set = (patch: Partial<TrackingConfig>) => setData({ ...data, ...patch } as typeof data);

  return (
    <>
      <Section title="Juleaften">
        <div className="form-grid">
          <Toggle checked={cfg.christmas.enabled} onChange={(v) => set({ christmas: { ...cfg.christmas, enabled: v } })} label="Den store juleflyvning er aktiv" />
          <Field label="Lokal ankomsttid i byerne" hint="Julemanden sigter efter dette klokkeslæt i hver by (±1 time)" id="xmas-time">
            <input id="xmas-time" className="input" type="time" value={cfg.christmas.localTargetTime.padStart(5, '0')} onChange={(e) => set({ christmas: { ...cfg.christmas, localTargetTime: e.target.value } })} />
          </Field>
          <Field label="Ophold pr. by (minutter)" id="xmas-stop">
            <input id="xmas-stop" className="input" type="number" min={0} max={30} step={0.5} value={cfg.christmas.stopMinutes} onChange={(e) => set({ christmas: { ...cfg.christmas, stopMinutes: Number(e.target.value) } })} />
          </Field>
        </div>
        <p className="hint">Ruten har {cfg.christmas.cities.length} byer. Bylisten kan redigeres under Avanceret → tracking.</p>
        <div className="row-actions">
          <input className="input" style={{ width: 110 }} type="number" value={previewYear} onChange={(e) => setPreviewYear(Number(e.target.value))} aria-label="År" />
          <button
            type="button"
            className="btn btn-small"
            onClick={() => apiGet<{ stops: PreviewStop[] }>(`/api/admin/preview/christmas?year=${previewYear}`).then((r) => setPreview(r.stops))}
          >
            Vis ruteplan (gemte data)
          </button>
          <a className="btn btn-small" href={`/?tid=${previewYear}-12-24T19:15`} target="_blank" rel="noopener noreferrer">
            Se juleaften i tidsmaskinen
          </a>
        </div>
        {preview && (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Stop</th>
                  <th>Lokal tid</th>
                  <th>Dansk tid</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((s, i) => (
                  <tr key={i}>
                    <td>{i}</td>
                    <td>
                      {s.name} {s.country && <small>({s.country})</small>}
                    </td>
                    <td className="mono">{s.kind === 'base' ? '–' : s.local}</td>
                    <td className="mono">{s.dk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Automatiske prøveflyvninger">
        <Toggle checked={cfg.autoTestFlights.enabled} onChange={(v) => set({ autoTestFlights: { ...cfg.autoTestFlights, enabled: v } })} label="Automatiske prøveflyvninger er slået til" />
        <p className="hint">
          Standard: weekender i slutningen af november og hver dag 1.–23. december om eftermiddagen. Perioderne kan finjusteres under Avanceret.
        </p>
        <Field label="Aflyste datoer (ÅÅÅÅ-MM-DD, adskilt af komma)" id="cancelled">
          <input
            id="cancelled"
            className="input"
            value={cfg.cancelledAutoDates.join(', ')}
            onChange={(e) =>
              set({
                cancelledAutoDates: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
      </Section>

      <Section
        title="Planlagte flyvninger"
        actions={
          <button
            type="button"
            className="btn btn-small"
            onClick={() => {
              const d = new Date(Date.now() + 86_400_000);
              const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T17:00`;
              set({
                scheduledFlights: [
                  ...cfg.scheduledFlights,
                  { id: slugId(`flyvning-${Date.now().toString(36)}`), title: 'Ny prøveflyvning', start, stops: [{ name: 'København', lat: 55.68, lon: 12.57, tz: 'Europe/Copenhagen' }], enabled: true, type: 'test' },
                ],
              });
            }}
          >
            <IconPlus /> Planlæg flyvning
          </button>
        }
      >
        <p className="hint">En planlagt flyvning erstatter den automatiske prøveflyvning samme dag.</p>
        {cfg.scheduledFlights.length === 0 && <p className="empty">Ingen planlagte flyvninger.</p>}
        {cfg.scheduledFlights.map((f, i) => (
          <FlightCard
            key={f.id}
            f={f}
            known={known}
            onChange={(p) => set({ scheduledFlights: updateAt(cfg.scheduledFlights, i, p) })}
            onRemove={() => window.confirm(`Slet "${f.title}"?`) && set({ scheduledFlights: cfg.scheduledFlights.filter((_, k) => k !== i) })}
          />
        ))}
      </Section>
      <SaveBar dirty={dirty} save={save} onSave={() => persist()} onReset={load} />
    </>
  );
}
