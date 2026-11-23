import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp, useNow } from '../../lib/app-context';
import { useDocumentTitle } from '../../lib/hooks';
import { useStored } from '../../lib/storage';
import { fmtTime, pad2 } from '../../lib/format';
import { cameraEventsBetween } from '@shared/northpole';
import { HOUR } from '@shared/time';
import { CameraFeed } from './CameraFeed';
import { EVENT_LABELS } from './scenes/effects';
import { HiddenNisse } from '../../components/HiddenNisse';
import { IconArrowLeft, IconArrowRight, IconCamera, IconGrid, IconGrid9, IconSingle } from '../../components/Icons';
import type { Camera } from '../../lib/api';
import './nvr.css';

type Layout = 'grid9' | 'grid4' | 'single';

function NvrBar({ cameras }: { cameras: Camera[] }) {
  const now = useNow(1000);
  const online = cameras.filter((c) => c.status === 'online').length;
  const disk = 72 + ((Math.floor(now / 60_000) * 7) % 23);
  return (
    <div className="nvr-bar" role="status">
      <span className="nvr-logo">
        <IconCamera /> NORDPOLEN NVR-{pad2(cameras.length)}
      </span>
      <span className="nvr-rec">
        <span className="rec-dot" /> REC
      </span>
      <span>
        Kanaler online: <b>{online}/{cameras.length}</b>
      </span>
      <span className="hide-sm">
        Disk: <b>{disk} %</b> <small>(mest kakaoopskrifter)</small>
      </span>
      <span className="hide-sm">
        Temperatur i serverrummet: <b>−4 °C</b>
      </span>
      <span className="nvr-clock mono">{fmtTime(now)}</span>
    </div>
  );
}

function EventLog({ camera }: { camera: Camera }) {
  const now = useNow(10_000);
  const events = useMemo(
    () => cameraEventsBetween(camera.id, now - 3 * HOUR, now, camera.events).reverse().slice(0, 12),
    [camera.id, camera.events, Math.floor(now / 10_000)],
  );
  return (
    <div className="nvr-eventlog">
      <h3>Hændelseslog</h3>
      {events.length === 0 ? (
        <p className="empty">Ingen hændelser de seneste 3 timer. Meget stille her …</p>
      ) : (
        <ol>
          {events.map((e) => (
            <li key={e.start} data-active={now >= e.start && now < e.end}>
              <span className="mono">{fmtTime(e.start)}</span> {EVENT_LABELS[e.type]}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function NvrPage() {
  const { data } = useApp();
  useDocumentTitle('Overvågning');
  const cameras = useMemo(() => (data?.cameras ?? []).slice().sort((a, b) => a.channel - b.channel), [data]);
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('kamera');
  const selected = cameras.find((c) => c.id === selectedId) ?? null;
  const [layout, setLayout] = useState<Layout>('grid9');
  const [page, setPage] = useState(0);
  const effectiveLayout: Layout = selected ? 'single' : layout === 'single' ? 'grid9' : layout;
  const [, setSeen] = useStored<string[]>('sete-kameraer', []);
  useEffect(() => {
    if (selected) setSeen((s) => (s.includes(selected.id) ? s : [...s, selected.id]));
  }, [selected, setSeen]);

  const select = useCallback(
    (id: string | null) => {
      const p = new URLSearchParams(params);
      if (id) p.set('kamera', id);
      else p.delete('kamera');
      setParams(p, { replace: !id });
    },
    [params, setParams],
  );

  // tastaturgenveje: 1-8 vælger kanal, Esc tilbage, pile skifter kamera
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 9) {
        const cam = cameras.find((c) => c.channel === n);
        if (cam) select(cam.id);
      } else if (e.key === 'Escape' && selected && !document.fullscreenElement) {
        select(null);
      } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && selected) {
        const i = cameras.indexOf(selected);
        const next = cameras[(i + (e.key === 'ArrowRight' ? 1 : -1) + cameras.length) % cameras.length];
        if (next) select(next.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cameras, selected, select]);

  if (!data) return <div className="loading-shimmer" style={{ height: 400, borderRadius: 16 }} />;

  const shown = effectiveLayout === 'grid4' ? cameras.slice(page * 4, page * 4 + 4) : cameras;
  const pages = Math.ceil(cameras.length / 4);

  return (
    <div className="nvr-page">
      <div className="page-hero">
        <div>
          <div className="eyebrow">Overvågningscentral</div>
          <h1>Nordpolens kameraer</h1>
          <p>Kig ind i værkstederne, stalden og kanegaragen. Hold øje – der sker sjove ting, når man mindst venter det!</p>
        </div>
        <HiddenNisse id="nvr" style={{ right: 4, top: 4 }} />
        <div className="nvr-layouts" role="group" aria-label="Visning">
          <button type="button" className="btn btn-small" aria-pressed={effectiveLayout === 'grid9'} onClick={() => { select(null); setLayout('grid9'); }}>
            <IconGrid9 /> Alle kameraer
          </button>
          <button type="button" className="btn btn-small" aria-pressed={effectiveLayout === 'grid4'} onClick={() => { select(null); setLayout('grid4'); }}>
            <IconGrid /> 4 ad gangen
          </button>
          <button type="button" className="btn btn-small" aria-pressed={effectiveLayout === 'single'} onClick={() => select(selected?.id ?? cameras[0]?.id ?? null)}>
            <IconSingle /> Ét kamera
          </button>
        </div>
      </div>

      <div className="nvr-console">
        <NvrBar cameras={cameras} />

        {effectiveLayout === 'single' && selected ? (
          <div className="nvr-single">
            <div className="nvr-single-main">
              <CameraFeed key={selected.id} camera={selected} variant="large" />
              <div className="nvr-single-nav">
                <button type="button" className="btn btn-small" onClick={() => select(null)}>
                  <IconGrid9 /> Tilbage til oversigt
                </button>
                <span className="nvr-hint hide-sm">Tip: tast 1–8 for at skifte kanal, ← → for næste</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button type="button" className="icon-btn" aria-label="Forrige kamera" onClick={() => select(cameras[(cameras.indexOf(selected) - 1 + cameras.length) % cameras.length]!.id)}>
                    <IconArrowLeft />
                  </button>
                  <button type="button" className="icon-btn" aria-label="Næste kamera" onClick={() => select(cameras[(cameras.indexOf(selected) + 1) % cameras.length]!.id)}>
                    <IconArrowRight />
                  </button>
                </span>
              </div>
            </div>
            <aside className="nvr-side">
              <div className="nvr-info">
                <div className="eyebrow">
                  CH{pad2(selected.channel)} · {selected.location}
                </div>
                <h2>{selected.name}</h2>
                <p>{selected.description}</p>
              </div>
              <nav className="nvr-channels" aria-label="Kanaler">
                {cameras.map((c) => (
                  <button key={c.id} type="button" aria-current={c.id === selected.id} onClick={() => select(c.id)} data-status={c.status}>
                    <span className="mono">CH{pad2(c.channel)}</span> {c.name}
                    <span className="ch-dot" />
                  </button>
                ))}
              </nav>
              <EventLog camera={selected} />
            </aside>
          </div>
        ) : (
          <>
            <div className={`nvr-grid nvr-${effectiveLayout}`}>
              {shown.map((c) => (
                <CameraFeed key={c.id} camera={c} variant="tile" onSelect={() => select(c.id)} />
              ))}
              {effectiveLayout === 'grid9' && cameras.length < 9 && (
                <div className="nvr-infotile">
                  <div className="eyebrow">Kontrolcentralen</div>
                  <p>Klik på et kamera for at se det stort. Tryk på knapperne for fuldskærm eller et separat vindue.</p>
                  <p className="nvr-disclaimer">Alle kameraer er simulerede – en fantasifuld oplevelse fra Nordpolens hemmelige verden. Der er ingen rigtig overvågning.</p>
                </div>
              )}
            </div>
            {effectiveLayout === 'grid4' && pages > 1 && (
              <div className="nvr-pager">
                <button type="button" className="btn btn-small" onClick={() => setPage((p) => (p - 1 + pages) % pages)} aria-label="Forrige side">
                  <IconArrowLeft />
                </button>
                <span>
                  Side {page + 1} af {pages}
                </span>
                <button type="button" className="btn btn-small" onClick={() => setPage((p) => (p + 1) % pages)} aria-label="Næste side">
                  <IconArrowRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <p className="nvr-disclaimer center">Kameraerne viser animationer og forudproducerede videoer fra Nordpolens fantasiverden – ikke rigtig overvågning.</p>
    </div>
  );
}
