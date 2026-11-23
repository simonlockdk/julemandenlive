import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiSend, type Camera } from '../../lib/api';
import { useAdminData } from '../useAdminData';
import { Field, Loading, SaveBar, Section, Toggle, updateAt } from './common';
import { IconPlus, IconTrash, IconArrowLeft, IconArrowRight } from '../../components/Icons';

const SCENES = ['workshop', 'stable', 'garage', 'packing', 'yard', 'office', 'training', 'secret'] as const;
const SCENE_LABEL: Record<(typeof SCENES)[number], string> = {
  workshop: 'Værksted',
  stable: 'Stald',
  garage: 'Kanegarage',
  packing: 'Pakkeri',
  yard: 'Gårdsplads',
  office: 'Julemandens kontor',
  training: 'Træningsbane',
  secret: 'Hemmeligt rum',
};
const EVENT_TYPES = [
  ['nisse-runs', 'Nisse løber forbi'],
  ['lights-out', 'Lyset slukkes'],
  ['gift-falls', 'Gave falder'],
  ['reindeer-closeup', 'Rensdyr kigger ind'],
  ['signal-loss', 'Signaltab'],
  ['tech-glitch', 'Teknisk fejl'],
  ['clip', 'Videoklip (fra listen nedenfor)'],
] as const;

interface MediaFile {
  name: string;
  url: string;
  size: number;
  modified: number;
}

function useMediaList() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const refresh = useCallback(() => {
    apiGet<{ files: MediaFile[] }>('/api/admin/media')
      .then((r) => setFiles(r.files))
      .catch(() => setFiles([]));
  }, []);
  useEffect(refresh, [refresh]);
  return { files, refresh };
}

const fmtSize = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} kB`);

export function CamerasEditor() {
  const { data, setData, loadError, persist, save, dirty, load } = useAdminData('cameras');
  const { files } = useMediaList();
  const [open, setOpen] = useState<number | null>(0);
  if (!data) return <Loading error={loadError} />;
  const cams = data.cameras;
  const set = (i: number, patch: Partial<Camera>) => setData({ cameras: updateAt(cams, i, patch) });
  const videos = files.filter((f) => /\.(mp4|m4v|webm)$/i.test(f.name));
  const images = files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name));

  return (
    <>
      <Section
        title="NVR-kameraer"
        actions={
          <button
            type="button"
            className="btn btn-small"
            onClick={() => {
              const n = cams.length + 1;
              let id = `cam${String(n).padStart(2, '0')}`;
              while (cams.some((c) => c.id === id)) id += 'x';
              setData({
                cameras: [
                  ...cams,
                  {
                    id,
                    channel: Math.min(64, Math.max(0, ...cams.map((c) => c.channel)) + 1),
                    name: 'Nyt kamera',
                    location: '',
                    description: '',
                    status: 'online',
                    source: { type: 'scene', scene: 'yard' },
                    loop: true,
                    fallbackScene: 'yard',
                    events: { enabled: true, perHour: 4, types: ['nisse-runs', 'signal-loss'] },
                  },
                ],
              });
              setOpen(cams.length);
            }}
          >
            <IconPlus /> Tilføj kamera
          </button>
        }
      >
        <p className="hint">
          Hvert kamera kan vise en animeret scene eller en rigtig video (MP4 eller HLS). Upload videoer under <b>Videoer</b>, og vælg dem her. Mangler videoen,
          vises reservescenen automatisk.
        </p>
        <div className="cam-list">
          {cams.map((c, i) => (
            <div key={c.id + i} className="cam-item" data-open={open === i}>
              <button type="button" className="cam-item-head" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span className="mono">CH{String(c.channel).padStart(2, '0')}</span>
                <b>{c.name}</b>
                <span className={`tag ${c.status === 'online' ? 'tag-ok' : 'tag-warn'}`}>{c.status}</span>
                <span className="tag tag-sim">{c.source.type === 'scene' ? `scene: ${c.source.scene}` : c.source.type}</span>
              </button>
              {open === i && (
                <div className="cam-item-body">
                  <div className="form-grid">
                    <Field label="Kamera-id" hint="Små bogstaver og tal, fx cam09" id={`id-${i}`}>
                      <input id={`id-${i}`} className="input" value={c.id} onChange={(e) => set(i, { id: e.target.value.toLowerCase() })} />
                    </Field>
                    <Field label="Kanalnummer" id={`ch-${i}`}>
                      <input id={`ch-${i}`} className="input" type="number" min={1} max={64} value={c.channel} onChange={(e) => set(i, { channel: Number(e.target.value) })} />
                    </Field>
                    <Field label="Navn" id={`n-${i}`}>
                      <input id={`n-${i}`} className="input" value={c.name} onChange={(e) => set(i, { name: e.target.value })} />
                    </Field>
                    <Field label="Placering" id={`l-${i}`}>
                      <input id={`l-${i}`} className="input" value={c.location} onChange={(e) => set(i, { location: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="Beskrivelse" id={`d-${i}`}>
                    <textarea id={`d-${i}`} className="textarea" rows={2} value={c.description} onChange={(e) => set(i, { description: e.target.value })} />
                  </Field>
                  <div className="form-grid">
                    <Field label="Status" id={`s-${i}`}>
                      <select id={`s-${i}`} className="select" value={c.status} onChange={(e) => set(i, { status: e.target.value as Camera['status'] })}>
                        <option value="online">Online</option>
                        <option value="maintenance">Service (testbillede)</option>
                        <option value="offline">Offline (ingen signal)</option>
                      </select>
                    </Field>
                    <Field label="Kilde" id={`t-${i}`}>
                      <select id={`t-${i}`} className="select" value={c.source.type} onChange={(e) => set(i, { source: { ...c.source, type: e.target.value as Camera['source']['type'] } })}>
                        <option value="scene">Animeret scene</option>
                        <option value="mp4">MP4-video</option>
                        <option value="hls">HLS-stream (.m3u8)</option>
                      </select>
                    </Field>
                    {c.source.type === 'scene' ? (
                      <Field label="Scene" id={`sc-${i}`}>
                        <select id={`sc-${i}`} className="select" value={c.source.scene ?? 'yard'} onChange={(e) => set(i, { source: { ...c.source, scene: e.target.value as (typeof SCENES)[number] } })}>
                          {SCENES.map((s) => (
                            <option key={s} value={s}>
                              {SCENE_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ) : (
                      <Field label="Video-URL" hint="Fx /media/videos/vaerksted.mp4 eller en https-adresse" id={`u-${i}`}>
                        <input id={`u-${i}`} className="input" list={`vids-${i}`} value={c.source.url ?? ''} onChange={(e) => set(i, { source: { ...c.source, url: e.target.value || undefined } })} />
                        <datalist id={`vids-${i}`}>
                          {videos.map((v) => (
                            <option key={v.name} value={v.url} />
                          ))}
                        </datalist>
                      </Field>
                    )}
                    <Field label="Reservescene" hint="Vises, hvis videoen mangler" id={`fb-${i}`}>
                      <select id={`fb-${i}`} className="select" value={c.fallbackScene ?? 'yard'} onChange={(e) => set(i, { fallbackScene: e.target.value as (typeof SCENES)[number] })}>
                        {SCENES.map((s) => (
                          <option key={s} value={s}>
                            {SCENE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {c.source.type !== 'scene' && (
                      <Field label="Plakatbillede (valgfrit)" id={`p-${i}`}>
                        <input id={`p-${i}`} className="input" list={`imgs-${i}`} value={c.poster ?? ''} onChange={(e) => set(i, { poster: e.target.value || undefined })} />
                        <datalist id={`imgs-${i}`}>
                          {images.map((v) => (
                            <option key={v.name} value={v.url} />
                          ))}
                        </datalist>
                      </Field>
                    )}
                  </div>
                  <Toggle checked={c.loop} onChange={(v) => set(i, { loop: v })} label="Gentag videoen i løkke" />
                  <fieldset className="admin-fieldset">
                    <legend>Sjove hændelser</legend>
                    <div className="form-grid">
                      <Toggle checked={c.events.enabled} onChange={(v) => set(i, { events: { ...c.events, enabled: v } })} label="Hændelser slået til" />
                      <Field label="Hændelser pr. time" id={`ph-${i}`}>
                        <input id={`ph-${i}`} className="input" type="number" min={0} max={120} value={c.events.perHour} onChange={(e) => set(i, { events: { ...c.events, perHour: Number(e.target.value) } })} />
                      </Field>
                    </div>
                    <div className="check-row">
                      {EVENT_TYPES.map(([t, label]) => (
                        <label key={t} className="check">
                          <input
                            type="checkbox"
                            checked={c.events.types.includes(t)}
                            onChange={(e) =>
                              set(i, { events: { ...c.events, types: e.target.checked ? [...c.events.types, t] : c.events.types.filter((x) => x !== t) } })
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    {c.events.types.includes('clip') && (
                      <Field label="Videoklip til hændelser (én URL pr. linje)" id={`cl-${i}`}>
                        <textarea
                          id={`cl-${i}`}
                          className="textarea"
                          rows={3}
                          value={(c.events.clips ?? []).map((x) => x.src).join('\n')}
                          onChange={(e) =>
                            set(i, {
                              events: {
                                ...c.events,
                                clips: e.target.value
                                  .split('\n')
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                                  .map((src) => ({ src })),
                              },
                            })
                          }
                        />
                      </Field>
                    )}
                  </fieldset>
                  <div className="row-actions">
                    <button type="button" className="btn btn-small" disabled={i === 0} onClick={() => {
                      const next = cams.slice();
                      [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                      setData({ cameras: next });
                      setOpen(i - 1);
                    }}>
                      <IconArrowLeft /> Flyt op
                    </button>
                    <button type="button" className="btn btn-small" disabled={i === cams.length - 1} onClick={() => {
                      const next = cams.slice();
                      [next[i + 1], next[i]] = [next[i]!, next[i + 1]!];
                      setData({ cameras: next });
                      setOpen(i + 1);
                    }}>
                      Flyt ned <IconArrowRight />
                    </button>
                    <button
                      type="button"
                      className="btn btn-small danger"
                      onClick={() => {
                        if (window.confirm(`Fjern kameraet "${c.name}"?`)) setData({ cameras: cams.filter((_, k) => k !== i) });
                      }}
                    >
                      <IconTrash /> Fjern kamera
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
      <SaveBar dirty={dirty} save={save} onSave={() => persist()} onReset={load} />
    </>
  );
}

export function MediaManager() {
  const { files, refresh } = useMediaList();
  const [progress, setProgress] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = (file: File) => {
    setMsg(null);
    setProgress(0);
    const fd = new FormData();
    fd.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/media');
    xhr.setRequestHeader('x-nordpolen', '1');
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let body: { error?: string; url?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* ok */
      }
      if (xhr.status === 200) {
        setMsg({ ok: true, text: `Uploadet: ${body.url}. Vælg den nu under Kameraer.` });
        refresh();
      } else {
        setMsg({ ok: false, text: body.error ?? (xhr.status === 413 ? 'Filen er for stor.' : `Upload fejlede (${xhr.status})`) });
      }
      if (input.current) input.current.value = '';
    };
    xhr.onerror = () => {
      setProgress(null);
      setMsg({ ok: false, text: 'Forbindelsen blev afbrudt under upload.' });
    };
    xhr.send(fd);
  };

  return (
    <Section title="Videoer og billeder">
      <p className="hint">
        Upload MP4- eller WebM-videoer (og evt. plakatbilleder). Filerne lægges i mediemappen på serveren og serveres direkte af Apache. Store filer kan også
        kopieres direkte til mappen <code>media/videos</code> med fx <code>scp</code> – se dokumentationen.
      </p>
      <div className="upload-box">
        <input ref={input} type="file" accept="video/mp4,video/webm,.m4v,image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} disabled={progress !== null} aria-label="Vælg fil til upload" />
        {progress !== null && (
          <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
        {msg && <p className={msg.ok ? 'ok' : 'admin-error'}>{msg.text}</p>}
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Fil</th>
            <th>Størrelse</th>
            <th>URL</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {files.length === 0 && (
            <tr>
              <td colSpan={4} className="empty">
                Ingen filer endnu.
              </td>
            </tr>
          )}
          {files.map((f) => (
            <tr key={f.name}>
              <td>
                <a href={f.url} target="_blank" rel="noopener noreferrer">
                  {f.name}
                </a>
              </td>
              <td>{fmtSize(f.size)}</td>
              <td>
                <code>{f.url}</code>
              </td>
              <td>
                <button type="button" className="btn btn-small" onClick={() => navigator.clipboard?.writeText(f.url)}>
                  Kopiér URL
                </button>{' '}
                <button
                  type="button"
                  className="btn btn-small danger"
                  onClick={async () => {
                    if (!window.confirm(`Slet ${f.name}? Kameraer, der bruger filen, skifter til reservescenen.`)) return;
                    await apiSend('DELETE', `/api/admin/media/${encodeURIComponent(f.name)}`).catch((e: Error) => setMsg({ ok: false, text: e.message }));
                    refresh();
                  }}
                >
                  Slet
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}
