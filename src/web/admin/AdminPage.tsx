/**
 * Administration af Nordpolens Kontrolcentral.
 * Alt valideres på serveren; ugyldige ændringer afvises med en forklaring.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, apiGet, apiSend } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';
import { Emblem } from '../components/Art';
import { CamerasEditor, MediaManager } from './editors/media';
import { FlightsEditor } from './editors/flights';
import { CalendarEditor } from './editors/calendar';
import { EventsEditor, StatusEditor, SiteEditor, AdvancedEditor, Overview } from './editors/misc';
import './admin.css';

const TABS = [
  { id: 'oversigt', label: 'Oversigt' },
  { id: 'kameraer', label: 'Kameraer' },
  { id: 'medier', label: 'Videoer' },
  { id: 'flyvninger', label: 'Flyvninger' },
  { id: 'status', label: 'Driftsstatus' },
  { id: 'begivenheder', label: 'Begivenheder' },
  { id: 'kalender', label: 'Julekalender' },
  { id: 'tekster', label: 'Tekster og sektioner' },
  { id: 'avanceret', label: 'Avanceret' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function Login({ onDone }: { onDone: (user: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await apiSend<{ user: string }>('POST', '/api/admin/login', { username, password });
      onDone(r.user);
    } catch (err) {
      const e2 = err as ApiError;
      setError(e2.status === 429 ? 'For mange forsøg. Vent et par minutter, og prøv igen.' : e2.message);
    } finally {
      setBusy(false);
      setPassword('');
    }
  };
  return (
    <form className="panel admin-login" onSubmit={submit}>
      <Emblem className="admin-emblem" />
      <h1>Kontrolcentralens administration</h1>
      <p className="hint">Kun for julemandens betroede nisser.</p>
      <div className="field">
        <label htmlFor="adm-user">Brugernavn</label>
        <input id="adm-user" className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="adm-pw">Adgangskode</label>
        <input id="adm-pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Logger ind …' : 'Log ind'}
      </button>
    </form>
  );
}

export default function AdminPage() {
  useDocumentTitle('Administration');
  const [user, setUser] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState<TabId>(() => {
    const h = window.location.hash.slice(1) as TabId;
    return TABS.some((t) => t.id === h) ? h : 'oversigt';
  });

  useEffect(() => {
    // robots: hold administrationen ude af søgemaskiner
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    apiGet<{ user: string }>('/api/admin/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
    return () => meta.remove();
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', `#${tab}`);
  }, [tab]);

  if (!checked) return <div className="loading-shimmer" style={{ height: 200, borderRadius: 16 }} />;
  if (!user)
    return (
      <Login
        onDone={(u) => {
          setUser(u);
          // genindlæs så tidsmaskinen bliver tilgængelig
          window.location.reload();
        }}
      />
    );

  return (
    <div className="admin">
      <div className="admin-head">
        <div>
          <div className="eyebrow">Administration</div>
          <h1>Kontrolcentralens styrepult</h1>
        </div>
        <div className="admin-user">
          Logget ind som <b>{user}</b>
          <button
            type="button"
            className="btn btn-small"
            onClick={async () => {
              await apiSend('POST', '/api/admin/logout').catch(() => undefined);
              window.location.reload();
            }}
          >
            Log ud
          </button>
        </div>
      </div>
      <div className="admin-layout">
        <nav className="admin-tabs" aria-label="Administrationsmenu">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-current={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="admin-body">
          {tab === 'oversigt' && <Overview />}
          {tab === 'kameraer' && <CamerasEditor />}
          {tab === 'medier' && <MediaManager />}
          {tab === 'flyvninger' && <FlightsEditor />}
          {tab === 'status' && <StatusEditor />}
          {tab === 'begivenheder' && <EventsEditor />}
          {tab === 'kalender' && <CalendarEditor />}
          {tab === 'tekster' && <SiteEditor />}
          {tab === 'avanceret' && <AdvancedEditor />}
        </div>
      </div>
    </div>
  );
}
