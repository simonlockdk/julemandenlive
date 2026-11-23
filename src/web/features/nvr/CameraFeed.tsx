/**
 * Ét kamera i Nordpolens NVR.
 * - Viser rigtig video (MP4 eller HLS), når den er konfigureret – ellers en
 *   animeret scene tegnet i kode.
 * - Afspiller/tegner kun, når kameraet er synligt og fanen er aktiv.
 * - Fejler videoen (mangler filen), skiftes automatisk til reservescenen.
 * - Hændelser (nisse løber forbi m.m.) tegnes ovenpå både video og scener.
 */
import { useEffect, useRef, useState, memo } from 'react';
import { useApp, useNow } from '../../lib/app-context';
import { useInView, usePageVisible, useReducedMotion } from '../../lib/hooks';
import { pad2 } from '../../lib/format';
import type { Camera } from '../../lib/api';
import { cameraEventAt, type CameraEvent } from '@shared/northpole';
import { DK_TZ, zonedParts } from '@shared/time';
import { SCENES, SCENE_W, SCENE_H, type SceneId } from './scenes';
import { cctv, drawEvent, maintenance, noSignal } from './scenes/effects';
import { schedule } from './scheduler';
import { IconExternal, IconMaximize } from '../../components/Icons';

const WEEKDAYS = ['SØN', 'MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR'];

function Timestamp() {
  const now = useNow(1000);
  const p = zonedParts(now, DK_TZ);
  return (
    <span className="osd-time">
      {pad2(p.day)}-{pad2(p.month)}-{p.year} {WEEKDAYS[p.weekday]} {pad2(p.hour)}:{pad2(p.minute)}:{pad2(p.second)}
    </span>
  );
}

export type FeedVariant = 'tile' | 'large' | 'solo';

interface Props {
  camera: Camera;
  variant: FeedVariant;
  onSelect?: () => void;
  actions?: boolean;
}

function CameraFeedInner({ camera, variant, onSelect, actions = true }: Props) {
  const { clock } = useApp();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView(wrapRef, '80px');
  const pageVisible = usePageVisible();
  const reduced = useReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);
  const [event, setEvent] = useState<CameraEvent | null>(null);
  const eventKey = useRef<number | null>(null);

  const src = camera.source.url;
  const wantsVideo = (camera.source.type === 'mp4' || camera.source.type === 'hls') && !!src;
  const isVideo = wantsVideo && !videoFailed && camera.status === 'online';
  const sceneId: SceneId = (camera.source.type === 'scene' ? camera.source.scene : camera.fallbackScene) ?? 'yard';
  const active = inView && pageVisible;

  useEffect(() => setVideoFailed(false), [src]);

  /* ----- tegneløkke: scene eller overlay ----- */
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const scale = variant === 'tile' ? 1 : 2;
    canvas.width = SCENE_W * scale;
    canvas.height = SCENE_H * scale;
    const fps = reduced ? 1 : variant === 'tile' ? 10 : 15;
    const scene = SCENES[sceneId];

    return schedule(() => {
      const now = clock.now();
      const t = now / 1000;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      if (camera.status === 'offline') {
        noSignal(ctx, t);
        return;
      }
      if (camera.status === 'maintenance') {
        maintenance(ctx, t);
        return;
      }
      if (isVideo) ctx.clearRect(0, 0, SCENE_W, SCENE_H);
      else scene(ctx, t);
      const ev = cameraEventAt(camera.id, now, camera.events);
      if (ev) drawEvent(ctx, ev, t);
      cctv(ctx, t, 1, isVideo);
      const key = ev ? ev.start : null;
      if (key !== eventKey.current) {
        eventKey.current = key;
        setEvent(ev);
      }
    }, fps);
  }, [active, variant, reduced, sceneId, isVideo, camera.id, camera.status, camera.events, clock]);

  /* ----- video: lazy load, afspil kun når synlig ----- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo || !src) return;
    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    if (!active) {
      v.pause();
      return;
    }
    const start = () => {
      v.play().catch(() => {
        /* autoplay kan blokeres – videoen er lydløs, så det sker sjældent */
      });
    };
    if (!v.dataset.loaded) {
      v.dataset.loaded = '1';
      if (camera.source.type === 'hls' && !v.canPlayType('application/vnd.apple.mpegurl')) {
        import('hls.js')
          .then(({ default: Hls }) => {
            if (cancelled) return;
            if (!Hls.isSupported()) {
              setVideoFailed(true);
              return;
            }
            const h = new Hls({ maxBufferLength: 10, capLevelToPlayerSize: true });
            h.on(Hls.Events.ERROR, (_e: unknown, data: { fatal?: boolean }) => {
              if (data.fatal) setVideoFailed(true);
            });
            h.loadSource(src);
            h.attachMedia(v);
            hls = h;
            start();
          })
          .catch(() => setVideoFailed(true));
      } else {
        v.src = src;
        start();
      }
    } else {
      start();
    }
    return () => {
      cancelled = true;
      v.pause();
      hls?.destroy();
      if (hls) delete v.dataset.loaded;
    };
  }, [active, isVideo, src, camera.source.type]);

  const openSeparate = () => {
    window.open(`/kamera/${encodeURIComponent(camera.id)}`, `nordpolen-${camera.id}`, 'width=1000,height=620,noopener');
  };
  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  };

  const statusLabel = camera.status === 'online' ? 'ONLINE' : camera.status === 'maintenance' ? 'SERVICE' : 'OFFLINE';
  const clipSrc = event?.type === 'clip' ? event.clip?.src : undefined;

  return (
    <div ref={wrapRef} className={`cam cam-${variant}`} data-status={camera.status} data-event={event?.type ?? ''}>
      {isVideo && (
        <video
          ref={videoRef}
          className="cam-video"
          muted
          playsInline
          loop={camera.loop}
          preload="none"
          poster={camera.poster}
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        />
      )}
      <canvas ref={canvasRef} className={`cam-canvas${isVideo ? ' overlay' : ''}`} aria-hidden="true" />
      {clipSrc && <video className="cam-video cam-clip" src={clipSrc} muted autoPlay playsInline aria-hidden="true" />}

      <div className="osd" aria-hidden="true">
        <div className="osd-top">
          <span className="osd-ch">
            CH{pad2(camera.channel)} <b>{camera.id.toUpperCase()}</b> {camera.name}
          </span>
          <Timestamp />
        </div>
        {event && event.type !== 'signal-loss' && <div className="osd-motion">BEVÆGELSE REGISTRERET</div>}
        {wantsVideo && videoFailed && <div className="osd-fallback">VIDEOSIGNAL MANGLER · RESERVEKAMERA</div>}
        <div className="osd-bottom">
          <span className="osd-live">
            <span className="rec-dot" /> LIVE <small>SIM</small>
          </span>
          <span className={`osd-status s-${camera.status}`}>● {statusLabel}</span>
        </div>
      </div>

      {onSelect && (
        <button type="button" className="cam-hit" onClick={onSelect} aria-label={`Vis ${camera.id.toUpperCase()} ${camera.name} i stor visning`} />
      )}
      {actions && (
        <div className="cam-actions">
          <button type="button" className="icon-btn" onClick={fullscreen} aria-label={`Fuldskærm: ${camera.name}`} title="Fuldskærm">
            <IconMaximize />
          </button>
          <button type="button" className="icon-btn" onClick={openSeparate} aria-label={`Åbn ${camera.name} i nyt vindue`} title="Åbn i nyt vindue">
            <IconExternal />
          </button>
        </div>
      )}
      <span className="sr-only">
        Kamera {camera.channel}: {camera.name}. {camera.description} Simuleret kamera fra Nordpolens fantasiverden.
      </span>
    </div>
  );
}

export const CameraFeed = memo(CameraFeedInner);
