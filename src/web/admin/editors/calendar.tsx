import { useState } from 'react';
import { useAdminData } from '../useAdminData';
import { Field, Loading, SaveBar, Section, updateAt } from './common';
import type { CalendarDoor } from '../../lib/api';

const TYPES: [CalendarDoor['type'], string][] = [
  ['story', 'Julehistorie'],
  ['tradition', 'Juletradition'],
  ['message', 'Hilsen/brev'],
  ['riddle', 'Gåde'],
  ['quiz', 'Quiz'],
  ['game', 'Spil'],
  ['animation', 'Animation'],
  ['video', 'Videohilsen'],
];

export function CalendarEditor() {
  const { data, setData, loadError, persist, save, dirty, load } = useAdminData('calendar');
  const [day, setDay] = useState(1);
  if (!data) return <Loading error={loadError} />;
  const idx = data.doors.findIndex((d) => d.day === day);
  const d = data.doors[idx]!;
  const set = (patch: Partial<CalendarDoor>) => setData({ doors: updateAt(data.doors, idx, patch) });
  const year = new Date().getFullYear();
  const has = (...t: CalendarDoor['type'][]) => t.includes(d.type);

  return (
    <>
      <Section title="Julekalenderens låger">
        <div className="door-picker" role="group" aria-label="Vælg låge">
          {data.doors
            .slice()
            .sort((a, b) => a.day - b.day)
            .map((x) => (
              <button key={x.day} type="button" aria-pressed={x.day === day} onClick={() => setDay(x.day)} title={x.title}>
                {x.day}
              </button>
            ))}
        </div>
        <div className="form-grid">
          <Field label="Type" id="door-type">
            <select id="door-type" className="select" value={d.type} onChange={(e) => set({ type: e.target.value as CalendarDoor['type'] })}>
              {TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Titel" id="door-title">
            <input id="door-title" className="input" value={d.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
        </div>
        {!has('riddle', 'quiz') && (
          <Field label="Tekst" hint="Tom linje = nyt afsnit. Teksten vises altid som ren tekst." id="door-body">
            <textarea id="door-body" className="textarea" rows={9} value={d.body ?? ''} onChange={(e) => set({ body: e.target.value || undefined })} />
          </Field>
        )}
        {has('riddle', 'quiz') && (
          <>
            <Field label="Spørgsmål" id="door-q">
              <textarea id="door-q" className="textarea" rows={3} value={d.question ?? ''} onChange={(e) => set({ question: e.target.value || undefined })} />
            </Field>
            <Field label={d.type === 'quiz' ? 'Forklaring efter svar' : 'Svar'} id="door-a">
              <textarea id="door-a" className="textarea" rows={2} value={d.answer ?? ''} onChange={(e) => set({ answer: e.target.value || undefined })} />
            </Field>
          </>
        )}
        {has('quiz') && (
          <div className="form-grid">
            <Field label="Svarmuligheder (én pr. linje, maks. 6)" id="door-opts">
              <textarea
                id="door-opts"
                className="textarea"
                rows={4}
                value={(d.options ?? []).join('\n')}
                onChange={(e) =>
                  set({
                    options: e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .slice(0, 6),
                  })
                }
              />
            </Field>
            <Field label="Rigtigt svar (nummer)" id="door-correct">
              <select id="door-correct" className="select" value={d.correct ?? 0} onChange={(e) => set({ correct: Number(e.target.value) })}>
                {(d.options ?? []).map((o, i) => (
                  <option key={i} value={i}>
                    {i + 1}. {o}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        {has('game') && (
          <Field label="Spil" id="door-game">
            <select id="door-game" className="select" value={d.game ?? 'memory'} onChange={(e) => set({ game: e.target.value as CalendarDoor['game'] })}>
              <option value="memory">Vendespil</option>
              <option value="catch">Fang gaverne</option>
              <option value="snowman">Byg en snemand</option>
            </select>
          </Field>
        )}
        {has('animation') && (
          <Field label="Animation" id="door-anim">
            <select id="door-anim" className="select" value={d.animation ?? 'snowglobe'} onChange={(e) => set({ animation: e.target.value as CalendarDoor['animation'] })}>
              <option value="snowglobe">Snekugle</option>
              <option value="fireworks">Stjerneregn – Glædelig jul</option>
              <option value="aurora">Nordlys</option>
              <option value="dance">Nisser danser om juletræet</option>
            </select>
          </Field>
        )}
        {has('video') && (
          <div className="form-grid">
            <Field label="Video-URL" hint="Fx /media/videos/hilsen.mp4" id="door-video">
              <input id="door-video" className="input" value={d.videoUrl ?? ''} onChange={(e) => set({ videoUrl: e.target.value || undefined })} />
            </Field>
            <Field label="Plakatbillede (valgfrit)" id="door-poster">
              <input id="door-poster" className="input" value={d.poster ?? ''} onChange={(e) => set({ poster: e.target.value || undefined })} />
            </Field>
          </div>
        )}
        <Field label="Afsender/signatur (valgfri)" id="door-from">
          <input id="door-from" className="input" value={d.from ?? ''} onChange={(e) => set({ from: e.target.value || undefined })} />
        </Field>
        <a className="btn btn-small" href={`/julekalender?tid=${year}-12-${String(day).padStart(2, '0')}T12:00`} target="_blank" rel="noopener noreferrer">
          Se låge {day} i tidsmaskinen (gem først)
        </a>
      </Section>
      <SaveBar dirty={dirty} save={save} onSave={() => persist()} onReset={load} />
    </>
  );
}
