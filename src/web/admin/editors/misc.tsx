import { useEffect, useState } from 'react';
import { apiGet, ApiError, apiSend } from '../../lib/api';
import { useApp } from '../../lib/app-context';
import { useAdminData, slugId } from '../useAdminData';
import { Field, Loading, SaveBar, Section, Toggle, updateAt } from './common';
import { IconPlus, IconTrash } from '../../components/Icons';
import { northPoleStatus } from '@shared/northpole';
import type { DataName } from '../../../server/schemas';

/* ---------------- oversigt + tidsmaskine ---------------- */

export function Overview() {
  const { timeMachine, clock } = useApp();
  const y = new Date(clock.now()).getFullYear();
  const [when, setWhen] = useState(`${y}-12-24T19:15`);
  const presets: [string, string][] = [
    [`${y}-11-29T12:00`, '1. søndag i advent'],
    [`${y}-12-01T08:00`, '1. december'],
    [`${y}-12-10T17:30`, 'Prøveflyvning i december'],
    [`${y}-12-24T07:00`, 'Juleaften – over Asien'],
    [`${y}-12-24T19:20`, 'Juleaften – over Danmark'],
    [`${y}-12-25T10:00`, '1. juledag'],
  ];
  return (
    <>
      <Section title="Velkommen, nisse!">
        <p>Herfra styrer du kameraer, flyvninger, driftsstatus, begivenheder, julekalender og tekster. Alle ændringer valideres og træder i kraft med det samme.</p>
        <ul className="admin-tips">
          <li>Gemte filer får automatisk en sikkerhedskopi (<code>*.prev.json</code>) i datamappen.</li>
          <li>Tidsmaskinen virker kun, mens du er logget ind – almindelige besøgende ser altid den rigtige tid.</li>
          <li>Videoer uploades under «Videoer» og tilknyttes under «Kameraer».</li>
        </ul>
      </Section>
      <Section title="Tidsmaskine">
        <p className="hint">Se hele portalen, som den vil se ud på et bestemt tidspunkt (dansk tid). Perfekt til at teste juleaften og kalenderlåger.</p>
        <div className="row-actions">
          <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Tidspunkt" style={{ maxWidth: 260 }} />
          <a className="btn btn-primary btn-small" href={`/?tid=${when}`}>
            Rejs til tidspunktet
          </a>
          {timeMachine.active && (
            <button type="button" className="btn btn-small" onClick={timeMachine.reset}>
              Tilbage til nu
            </button>
          )}
        </div>
        <div className="row-actions">
          {presets.map(([t, l]) => (
            <a key={t} className="btn btn-small" href={`/?tid=${t}`}>
              {l}
            </a>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ---------------- driftsstatus ---------------- */

export function StatusEditor() {
  const { data, setData, loadError, persist, save, dirty, load } = useAdminData('status');
  const { clock } = useApp();
  if (!data) return <Loading error={loadError} />;
  const auto = northPoleStatus(clock.now());
  return (
    <>
      <Section title="Overstyr statusværdier">
        <p className="hint">Lad feltet stå tomt for at bruge den automatiske, fantasifulde værdi. Procenter skrives som fx «95 %».</p>
        <div className="form-grid">
          {auto.map((it) => (
            <Field key={it.key} label={it.label} id={`ov-${it.key}`}>
              <input
                id={`ov-${it.key}`}
                className="input"
                placeholder={`Automatisk: ${it.value}`}
                value={data.overrides[it.key] ?? ''}
                maxLength={80}
                onChange={(e) => {
                  const o = { ...data.overrides };
                  if (e.target.value) o[it.key] = e.target.value;
                  else delete o[it.key];
                  setData({ ...data, overrides: o });
                }}
              />
            </Field>
          ))}
        </div>
      </Section>
      <Section
        title="Beskeder i statuspanelet"
        actions={
          <button type="button" className="btn btn-small" onClick={() => setData({ ...data, messages: [...data.messages, { id: slugId(`besked-${Date.now().toString(36)}`), text: 'Ny besked fra kontrolcentralen', level: 'info' }] })}>
            <IconPlus /> Ny besked
          </button>
        }
      >
        {data.messages.length === 0 && <p className="empty">Ingen beskeder.</p>}
        {data.messages.map((m, i) => (
          <div key={m.id} className="flight-card">
            <Field label="Tekst" id={`mt-${i}`}>
              <input id={`mt-${i}`} className="input" value={m.text} maxLength={300} onChange={(e) => setData({ ...data, messages: updateAt(data.messages, i, { text: e.target.value }) })} />
            </Field>
            <div className="form-grid">
              <Field label="Type" id={`ml-${i}`}>
                <select id={`ml-${i}`} className="select" value={m.level} onChange={(e) => setData({ ...data, messages: updateAt(data.messages, i, { level: e.target.value as 'info' }) })}>
                  <option value="info">Information</option>
                  <option value="ok">God nyhed</option>
                  <option value="warn">Advarsel</option>
                </select>
              </Field>
              <Field label="Vis fra (valgfri)" id={`ms-${i}`}>
                <input id={`ms-${i}`} className="input" type="datetime-local" value={m.start ?? ''} onChange={(e) => setData({ ...data, messages: updateAt(data.messages, i, { start: e.target.value || undefined }) })} />
              </Field>
              <Field label="Vis til (valgfri)" id={`me-${i}`}>
                <input id={`me-${i}`} className="input" type="datetime-local" value={m.end ?? ''} onChange={(e) => setData({ ...data, messages: updateAt(data.messages, i, { end: e.target.value || undefined }) })} />
              </Field>
            </div>
            <button type="button" className="btn btn-small danger" onClick={() => setData({ ...data, messages: data.messages.filter((_, k) => k !== i) })}>
              <IconTrash /> Slet besked
            </button>
          </div>
        ))}
      </Section>
      <SaveBar dirty={dirty} save={save} onSave={() => persist()} onReset={load} />
    </>
  );
}

/* ---------------- begivenheder ---------------- */

const EVENT_TYPES: [string, string][] = [
  ['banner', 'Banner på siden'],
  ['celebration', 'Festlig begivenhed'],
  ['grounded', 'Flyveforbud (aflyser prøveflyvninger)'],
  ['snowstorm', 'Snestorm (mere sne + advarsel)'],
  ['aurora', 'Kraftigt nordlys i baggrunden'],
];

export function EventsEditor() {
  const { data, setData, loadError, persist, save, dirty, load } = useAdminData('events');
  if (!data) return <Loading error={loadError} />;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <Section
        title="Særlige julebegivenheder"
        actions={
          <button
            type="button"
            className="btn btn-small"
            onClick={() =>
              setData({ events: [...data.events, { id: slugId(`begivenhed-${Date.now().toString(36)}`), type: 'banner', title: 'Ny begivenhed', message: '', start: `${today}T00:00`, end: `${today}T23:59`, enabled: true }] })
            }
          >
            <IconPlus /> Ny begivenhed
          </button>
        }
      >
        <p className="hint">Begivenheder vises i det angivne tidsrum (dansk tid). Flyveforbud aflyser automatiske og planlagte prøveflyvninger – men aldrig juleaften.</p>
        {data.events.length === 0 && <p className="empty">Ingen begivenheder.</p>}
        {data.events.map((e, i) => (
          <div key={e.id} className="flight-card">
            <div className="form-grid">
              <Field label="Type" id={`et-${i}`}>
                <select id={`et-${i}`} className="select" value={e.type} onChange={(ev) => setData({ events: updateAt(data.events, i, { type: ev.target.value as 'banner' }) })}>
                  {EVENT_TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Titel" id={`eti-${i}`}>
                <input id={`eti-${i}`} className="input" value={e.title} onChange={(ev) => setData({ events: updateAt(data.events, i, { title: ev.target.value }) })} />
              </Field>
              <Field label="Fra" id={`es-${i}`}>
                <input id={`es-${i}`} className="input" type="datetime-local" value={e.start} onChange={(ev) => setData({ events: updateAt(data.events, i, { start: ev.target.value }) })} />
              </Field>
              <Field label="Til" id={`ee-${i}`}>
                <input id={`ee-${i}`} className="input" type="datetime-local" value={e.end} onChange={(ev) => setData({ events: updateAt(data.events, i, { end: ev.target.value }) })} />
              </Field>
            </div>
            <Field label="Besked" id={`em-${i}`}>
              <input id={`em-${i}`} className="input" value={e.message} maxLength={500} onChange={(ev) => setData({ events: updateAt(data.events, i, { message: ev.target.value }) })} />
            </Field>
            <div className="row-actions">
              <Toggle checked={e.enabled} onChange={(v) => setData({ events: updateAt(data.events, i, { enabled: v }) })} label="Aktiv" />
              <button type="button" className="btn btn-small danger" onClick={() => setData({ events: data.events.filter((_, k) => k !== i) })}>
                <IconTrash /> Slet
              </button>
            </div>
          </div>
        ))}
      </Section>
      <SaveBar dirty={dirty} save={save} onSave={() => persist()} onReset={load} />
    </>
  );
}

/* ---------------- tekster og sektioner ---------------- */

const SECTION_LABELS: Record<string, string> = {
  countdowns: 'Nedtællinger',
  advent: 'Adventskrans',
  status: 'Driftsstatus',
  logbook: 'Logbog',
  weather: 'Vejrmelding',
  fact: 'Dagens julefakta',
  nvrPreview: 'Kameraer på forsiden',
  journal: 'Flyvejournal',
};
const FEATURE_LABELS: Record<string, string> = {
  snow: 'Faldende sne',
  nisseAlarm: 'Nissealarmer',
  hiddenNisser: 'Skjulte nisser',
};

export function SiteEditor() {
  const { data, setData, loadError, persist, save, dirty, load } = useAdminData('site');
  if (!data) return <Loading error={loadError} />;
  const text = (k: 'title' | 'tagline' | 'heroTitle' | 'heroText' | 'footerText', label: string, area = false) => (
    <Field label={label} id={`site-${k}`}>
      {area ? (
        <textarea id={`site-${k}`} className="textarea" rows={3} value={data[k]} onChange={(e) => setData({ ...data, [k]: e.target.value })} />
      ) : (
        <input id={`site-${k}`} className="input" value={data[k]} onChange={(e) => setData({ ...data, [k]: e.target.value })} />
      )}
    </Field>
  );
  return (
    <>
      <Section title="Tekster">
        {text('title', 'Sidens navn')}
        {text('tagline', 'Undertitel')}
        {text('heroTitle', 'Velkomstoverskrift')}
        {text('heroText', 'Velkomsttekst', true)}
        {text('footerText', 'Tekst i bunden (om simulation og privatliv)', true)}
      </Section>
      <Section title="Banner øverst på siden">
        <Toggle checked={data.banner.enabled} onChange={(v) => setData({ ...data, banner: { ...data.banner, enabled: v } })} label="Vis banner" />
        <div className="form-grid">
          <Field label="Bannertekst" id="banner-text">
            <input id="banner-text" className="input" value={data.banner.text} onChange={(e) => setData({ ...data, banner: { ...data.banner, text: e.target.value } })} />
          </Field>
          <Field label="Type" id="banner-level">
            <select id="banner-level" className="select" value={data.banner.level} onChange={(e) => setData({ ...data, banner: { ...data.banner, level: e.target.value as 'info' } })}>
              <option value="info">Information</option>
              <option value="ok">God nyhed</option>
              <option value="warn">Advarsel</option>
            </select>
          </Field>
        </div>
      </Section>
      <Section title="Forsidens sektioner">
        <div className="check-grid">
          {Object.entries(data.sections).map(([k, v]) => (
            <Toggle key={k} checked={v} onChange={(nv) => setData({ ...data, sections: { ...data.sections, [k]: nv } })} label={SECTION_LABELS[k] ?? k} />
          ))}
        </div>
      </Section>
      <Section title="Funktioner">
        <div className="check-grid">
          {Object.entries(data.features).map(([k, v]) => (
            <Toggle key={k} checked={v} onChange={(nv) => setData({ ...data, features: { ...data.features, [k]: nv } })} label={FEATURE_LABELS[k] ?? k} />
          ))}
        </div>
      </Section>
      <SaveBar dirty={dirty} save={save} onSave={() => persist()} onReset={load} />
    </>
  );
}

/* ---------------- avanceret JSON ---------------- */

const FILES: [DataName, string][] = [
  ['tracking', 'Flyveruter og byer (tracking)'],
  ['cameras', 'Kameraer'],
  ['calendar', 'Julekalender'],
  ['events', 'Begivenheder'],
  ['status', 'Driftsstatus'],
  ['site', 'Tekster og sektioner'],
];

export function AdvancedEditor() {
  const { reload } = useApp();
  const [name, setName] = useState<DataName>('tracking');
  const [text, setText] = useState('');
  const [orig, setOrig] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string; issues?: string[] } | null>(null);

  useEffect(() => {
    setMsg(null);
    apiGet<unknown>(`/api/admin/data/${name}`).then((d) => {
      const s = JSON.stringify(d, null, 2);
      setText(s);
      setOrig(s);
    });
  }, [name]);

  const saveIt = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setMsg({ ok: false, text: `Ugyldig JSON: ${(e as Error).message}` });
      return;
    }
    try {
      const saved = await apiSend<unknown>('PUT', `/api/admin/data/${name}`, parsed);
      const s = JSON.stringify(saved, null, 2);
      setText(s);
      setOrig(s);
      setMsg({ ok: true, text: 'Gemt og valideret.' });
      reload();
    } catch (e) {
      const err = e as ApiError;
      setMsg({ ok: false, text: err.message, issues: err.issues });
    }
  };

  return (
    <Section title="Avanceret redigering (JSON)">
      <p className="hint">Her kan alle indstillinger redigeres direkte. Serveren afviser ugyldige data, så du kan ikke ødelægge siden ved en fejl.</p>
      <div className="row-actions">
        <select className="select" value={name} onChange={(e) => setName(e.target.value as DataName)} aria-label="Datafil" style={{ maxWidth: 320 }}>
          {FILES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <a className="btn btn-small" href={`data:application/json;charset=utf-8,${encodeURIComponent(orig)}`} download={`${name}.json`}>
          Download sikkerhedskopi
        </a>
      </div>
      <textarea className="textarea json-area" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} aria-label="JSON-indhold" />
      {msg && (
        <div className={msg.ok ? 'ok' : 'admin-error'} role="status">
          {msg.text}
          {msg.issues && (
            <ul className="issues">
              {msg.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="row-actions">
        <button type="button" className="btn btn-small" disabled={text === orig} onClick={() => setText(orig)}>
          Fortryd
        </button>
        <button type="button" className="btn btn-primary btn-small" disabled={text === orig} onClick={saveIt}>
          Gem
        </button>
      </div>
    </Section>
  );
}
