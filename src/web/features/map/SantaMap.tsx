/**
 * Julemandens flyradar – interaktivt globuskort med kanen, ruter og stop.
 * MapLibre indlæses først, når komponenten vises (holder forsiden hurtig).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GeoJSONSource, Map as MlMap, Marker } from 'maplibre-gl';
import { SleighArt } from '../../components/Art';
import { IconClose, IconGlobe, IconTarget, IconPin, IconStar } from '../../components/Icons';
import { HiddenNisse } from '../../components/HiddenNisse';
import { useApp } from '../../lib/app-context';
import { useReducedMotion } from '../../lib/hooks';
import { fmtNum, fmtTime, fmtTimeIn, fmtDayTime } from '../../lib/format';
import { useSleigh } from './sleigh-context';
import { buildMapStyle } from './mapStyle';
import { buildRouteGeo, pointAhead, polarCap } from './route-geo';
import { modeLabel, displayFlightAt } from './labels';
import type { FlightPlan, RouteStop } from '@shared/tracking';
import { compassDa } from '@shared/geo';
import './map.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

const VIEWS = {
  europa: { center: [10, 53] as [number, number], zoom: 3.1 },
  verden: { center: [15, 30] as [number, number], zoom: 1.15 },
  nordpolen: { center: [0, 84] as [number, number], zoom: 2.4 },
};

export default function SantaMap() {
  const { clock } = useApp();
  const { flights, home, stateAt, ready } = useSleigh();
  const reduced = useReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const sleighMarker = useRef<Marker | null>(null);
  const sleighEl = useMemo(() => document.createElement('div'), []);
  const homeEl = useMemo(() => document.createElement('div'), []);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [follow, setFollow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedStop, setSelectedStop] = useState<{ stop: RouteStop; flight: FlightPlan } | null>(null);
  const followRef = useRef(follow);
  followRef.current = follow;
  const autoFollowDone = useRef(false);

  /* ---------------- kortet oprettes ---------------- */
  useEffect(() => {
    let map: MlMap | null = null;
    let cancelled = false;
    (async () => {
      try {
        const [mod] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]);
        const maplibregl = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod;
        // MapLibre 6 leder efter sin worker ved siden af sin egen fil – peg på den byggede asset.
        maplibregl.setWorkerUrl(new URL(workerUrl, window.location.href).href);
        if (cancelled || !container.current) return;
        const m = new maplibregl.Map({
          container: container.current,
          style: buildMapStyle(),
          center: VIEWS.europa.center,
          zoom: VIEWS.europa.zoom,
          minZoom: 0.6,
          maxZoom: 11,
          attributionControl: { compact: true },
          renderWorldCopies: false,
          fadeDuration: 0,
          maxPitch: 0,
          dragRotate: false,
          pitchWithRotate: false,
          locale: {
            'NavigationControl.ZoomIn': 'Zoom ind',
            'NavigationControl.ZoomOut': 'Zoom ud',
            'NavigationControl.ResetBearing': 'Nulstil retning',
            'AttributionControl.ToggleAttribution': 'Vis kortkilder',
            'GlobeControl.Enable': 'Vis som globus',
            'GlobeControl.Disable': 'Vis som fladt kort',
          },
        });
        map = m;
        mapRef.current = m;
        m.touchZoomRotate.disableRotation();
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

        m.on('error', (e) => {
          // enkelte fliser kan fejle uden at kortet er i stykker
          if (String((e as unknown as { error?: { message?: string } }).error?.message ?? '').includes('style')) {
            setFailed('Kortet kunne ikke hentes lige nu.');
          }
        });
        m.on('dragstart', (e) => {
          if ((e as { originalEvent?: Event }).originalEvent) setFollow(false);
        });

        m.on('load', () => {
          const map = m;
          map.addSource('polar', { type: 'geojson', data: polarCap() });
          map.addLayer({ id: 'polar-cap', type: 'fill', source: 'polar', paint: { 'fill-color': '#dce6f7', 'fill-opacity': 0.55 } });
          const emptyLine = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } } as const;
          map.addSource('planned', { type: 'geojson', data: emptyLine as never });
          map.addSource('flown', { type: 'geojson', data: emptyLine as never });
          map.addSource('stops', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          map.addSource('trail', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          map.addLayer({
            id: 'planned',
            type: 'line',
            source: 'planned',
            layout: { 'line-cap': 'round' },
            paint: { 'line-color': '#f7f2e8', 'line-opacity': 0.55, 'line-width': 1.6, 'line-dasharray': [1.5, 2.5] },
          });
          map.addLayer({
            id: 'flown-glow',
            type: 'line',
            source: 'flown',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#f2c96b', 'line-opacity': 0.25, 'line-width': 8, 'line-blur': 6 },
          });
          map.addLayer({
            id: 'flown',
            type: 'line',
            source: 'flown',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#f8dfa0', 'line-width': 2.4 },
          });
          map.addLayer({
            id: 'trail',
            type: 'circle',
            source: 'trail',
            paint: {
              'circle-radius': ['get', 'r'],
              'circle-color': '#fff6d8',
              'circle-opacity': ['get', 'o'],
              'circle-blur': 0.6,
            },
          });
          map.addLayer({
            id: 'stops',
            type: 'circle',
            source: 'stops',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2.5, 5, 5],
              'circle-color': ['match', ['get', 'status'], 'visited', '#f2c96b', 'current', '#ec5b6f', '#0a1530'],
              'circle-stroke-color': ['match', ['get', 'status'], 'upcoming', '#f7f2e8', '#fff6d8'],
              'circle-stroke-width': 1.4,
            },
          });
          map.addLayer({
            id: 'stop-labels',
            type: 'symbol',
            source: 'stops',
            minzoom: 3.6,
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Regular'],
              'text-size': 11,
              'text-offset': [0, -1.1],
              'text-anchor': 'bottom',
              'text-optional': true,
            },
            paint: {
              'text-color': ['match', ['get', 'status'], 'visited', '#f8dfa0', '#f7f2e8'],
              'text-halo-color': '#050b1a',
              'text-halo-width': 1.4,
            },
          });

          map.on('click', 'stops', (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const idx = Number(f.properties?.idx);
            const fl = currentFlight.current;
            if (fl && fl.stops[idx]) {
              setSelectedStop({ stop: fl.stops[idx]!, flight: fl });
              setShowDetails(false);
            }
          });
          map.on('mouseenter', 'stops', () => (map!.getCanvas().style.cursor = 'pointer'));
          map.on('mouseleave', 'stops', () => (map!.getCanvas().style.cursor = ''));

          // markører
          sleighEl.className = 'sleigh-marker';
          sleighEl.setAttribute('role', 'button');
          sleighEl.setAttribute('tabindex', '0');
          sleighEl.setAttribute('aria-label', 'Julemandens kane – vis detaljer');
          sleighEl.addEventListener('click', (ev) => {
            ev.stopPropagation();
            setShowDetails((v) => !v);
            setSelectedStop(null);
          });
          sleighEl.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              setShowDetails((v) => !v);
            }
          });
          sleighMarker.current = new maplibregl.Marker({ element: sleighEl, rotationAlignment: 'viewport', pitchAlignment: 'viewport' })
            .setLngLat([home.lon, home.lat])
            .addTo(map);
          homeEl.className = 'home-marker';
          new maplibregl.Marker({ element: homeEl, anchor: 'bottom' }).setLngLat([0, 89.9]).addTo(map);
          setLoaded(true);
        });
      } catch (err) {
        console.error(err);
        setFailed('Din browser kan ikke vise det interaktive kort (WebGL mangler). Flydata vises stadig herunder.');
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      sleighMarker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentFlight = useRef<FlightPlan | null>(null);

  /* ---------------- animationsløkke ---------------- */
  useEffect(() => {
    if (!loaded || !ready) return;
    const map = mapRef.current;
    const marker = sleighMarker.current;
    if (!map || !marker) return;
    const inner = sleighEl;
    let raf = 0;
    let lastFrame = 0;
    let lastRoute = 0;
    let lastTrail = 0;
    let lastFlightId: string | null = 'init';
    const trail: { lon: number; lat: number; t: number }[] = [];

    const tick = (ts: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      const minDt = reduced ? 1000 : 33;
      if (ts - lastFrame < minDt) return;
      lastFrame = ts;
      const t = clock.now();
      const s = stateAt(t);
      marker.setLngLat([s.lon, s.lat]);

      // vend kanen i flyveretningen (på skærmen)
      let flip = 1;
      let tilt = 0;
      if (s.mode === 'flying' || s.mode === 'visiting' || s.mode === 'preparing') {
        const p1 = map.project([s.lon, s.lat]);
        const p2 = map.project(pointAhead(s.lat, s.lon, s.bearing));
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        if (dx < 0) flip = -1;
        if (s.mode === 'flying') tilt = Math.max(-28, Math.min(28, (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI));
      }
      inner.style.setProperty('--flip', String(flip));
      inner.style.setProperty('--tilt', `${tilt * flip}deg`);
      inner.dataset.mode = s.mode;

      const display = displayFlightAt(t, s, flights);
      currentFlight.current = display;
      if (display?.id !== lastFlightId || ts - lastRoute > (reduced ? 2000 : 900)) {
        lastRoute = ts;
        lastFlightId = display?.id ?? null;
        const geo = buildRouteGeo(display, s.flight ? s : null, t);
        (map.getSource('flown') as GeoJSONSource | undefined)?.setData(geo.flown);
        (map.getSource('planned') as GeoJSONSource | undefined)?.setData(geo.planned);
        (map.getSource('stops') as GeoJSONSource | undefined)?.setData(geo.stops);
      }

      // stjernestøv bag kanen
      if (!reduced && ts - lastTrail > 120) {
        lastTrail = ts;
        if (s.mode === 'flying') trail.push({ lon: s.lon, lat: s.lat, t: ts });
        while (trail.length && ts - trail[0]!.t > 2600) trail.shift();
        (map.getSource('trail') as GeoJSONSource | undefined)?.setData({
          type: 'FeatureCollection',
          features: trail.map((p) => {
            const age = (ts - p.t) / 2600;
            return {
              type: 'Feature',
              properties: { r: 1.5 + (1 - age) * 3.5, o: (1 - age) * 0.8 },
              geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
            };
          }),
        });
      }

      if (!autoFollowDone.current) {
        autoFollowDone.current = true;
        if (s.mode === 'flying' || s.mode === 'visiting') {
          setFollow(true);
          map.jumpTo({ center: [s.lon, s.lat], zoom: Math.max(map.getZoom(), 3.4) });
        }
      }
      if (followRef.current && !map.isMoving()) {
        map.jumpTo({ center: [s.lon, s.lat] });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loaded, ready, flights, stateAt, clock, reduced, sleighEl]);

  const goView = useCallback((v: keyof typeof VIEWS) => {
    setFollow(false);
    mapRef.current?.flyTo({ ...VIEWS[v], duration: reduced ? 0 : 1600, essential: true });
  }, [reduced]);

  const findSleigh = useCallback(() => {
    const s = stateAt(clock.now());
    setFollow(true);
    mapRef.current?.flyTo({
      center: [s.lon, s.lat],
      zoom: s.mode === 'home' ? 2.6 : Math.max(mapRef.current.getZoom(), 4),
      duration: reduced ? 0 : 1400,
      essential: true,
    });
  }, [stateAt, clock, reduced]);

  return (
    <div className="map-shell">
      <div ref={container} className="map-canvas" aria-label="Interaktivt kort over julemandens rute" role="region" />
      {!loaded && !failed && (
        <div className="map-loading loading-shimmer" aria-live="polite">
          <SleighArt className="map-loading-sleigh" />
          <span>Forbinder til Nordpolens radar …</span>
        </div>
      )}
      {failed && (
        <div className="map-failed" role="alert">
          <SleighArt className="map-loading-sleigh" />
          <p>{failed}</p>
        </div>
      )}
      <HiddenNisse id="kort" style={{ left: 14, top: 46 }} />

      <div className="map-hud" aria-hidden={!loaded}>
        <span className="tag tag-sim" title="Kanens position er en magisk simulation – ikke rigtige GPS-data">
          <IconStar width={12} /> Magisk simulation
        </span>
      </div>

      <div className="map-tools" role="toolbar" aria-label="Kortvisning">
        <button type="button" className="btn btn-small" aria-pressed={follow} onClick={() => (follow ? setFollow(false) : findSleigh())}>
          <IconTarget /> {follow ? 'Følger kanen' : 'Følg kanen'}
        </button>
        <button type="button" className="btn btn-small" onClick={() => goView('europa')}>
          <IconPin /> Europa
        </button>
        <button type="button" className="btn btn-small" onClick={() => goView('verden')}>
          <IconGlobe /> Hele verden
        </button>
        <button type="button" className="btn btn-small" onClick={() => goView('nordpolen')}>
          <IconStar /> Nordpolen
        </button>
      </div>

      {showDetails && <SleighDetails onClose={() => setShowDetails(false)} />}
      {selectedStop && (
        <StopCard
          stop={selectedStop.stop}
          flight={selectedStop.flight}
          onClose={() => setSelectedStop(null)}
        />
      )}

      {createPortal(
        <div className="sleigh-inner">
          <div className="sleigh-halo" />
          <SleighArt className="sleigh-svg" />
        </div>,
        sleighEl,
      )}
      {createPortal(
        <div className="home-pin" title="Nordpolen – julemandens værksted">
          <svg viewBox="0 0 20 48" aria-hidden="true">
            <defs>
              <pattern id="cane" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                <rect width="8" height="8" fill="#f7f2e8" />
                <rect width="4" height="8" fill="#d42a45" />
              </pattern>
            </defs>
            <rect x="7" y="10" width="6" height="38" rx="2" fill="url(#cane)" />
            <circle cx="10" cy="8" r="7" fill="#f2c96b" />
            <path d="M10 3l1.5 3.4 3.7.4-2.8 2.4.9 3.6L10 11l-3.3 1.8.9-3.6-2.8-2.4 3.7-.4z" fill="#fff6d8" />
          </svg>
          <span>Nordpolen</span>
        </div>,
        homeEl,
      )}
    </div>
  );
}

function SleighDetails({ onClose }: { onClose: () => void }) {
  const { clock } = useApp();
  const { stateAt } = useSleigh();
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);
  const now = clock.now();
  const s = stateAt(now);
  return (
    <div className="map-card" role="dialog" aria-label="Kanens detaljer">
      <button type="button" className="icon-btn map-card-close" onClick={onClose} aria-label="Luk">
        <IconClose />
      </button>
      <div className="eyebrow">Kanen · {s.flight?.title ?? 'På Nordpolen'}</div>
      <h3>{modeLabel(s)}</h3>
      <dl className="mini-stats">
        <div>
          <dt>Hastighed</dt>
          <dd className="mono">{fmtNum(s.speedKmh)} km/t</dd>
        </div>
        <div>
          <dt>Højde</dt>
          <dd className="mono">{fmtNum(s.altitudeM)} m</dd>
        </div>
        <div>
          <dt>Kurs</dt>
          <dd className="mono">
            {Math.round(s.bearing)}° {compassDa(s.bearing)}
          </dd>
        </div>
        <div>
          <dt>Rensdyr</dt>
          <dd>9 i spandet</dd>
        </div>
      </dl>
      {s.nextStop && s.mode !== 'home' && (
        <p className="map-card-line">
          Næste stop: <strong>{s.nextStop.name}</strong> kl. {fmtTime(s.nextStop.arrive)}
        </p>
      )}
      {s.mode === 'home' && s.nextFlight && (
        <p className="map-card-line">
          Næste flyvning: <strong>{s.nextFlight.title}</strong> {fmtDayTime(s.nextFlight.stops[0]!.depart, now)}
        </p>
      )}
      <p className="map-card-note">Data er en magisk simulation fra Nordpolens kontrolcentral.</p>
    </div>
  );
}

function StopCard({ stop, flight, onClose }: { stop: RouteStop; flight: FlightPlan; onClose: () => void }) {
  const tz = stop.tz;
  const { clock } = useApp();
  const now = clock.now();
  const status = now >= stop.depart ? 'Besøgt' : now >= stop.arrive ? 'Julemanden er her nu!' : 'Kommende stop';
  return (
    <div className="map-card" role="dialog" aria-label={`Stop: ${stop.name}`}>
      <button type="button" className="icon-btn map-card-close" onClick={onClose} aria-label="Luk">
        <IconClose />
      </button>
      <div className="eyebrow">{flight.title}</div>
      <h3>
        {stop.name}
        {stop.country ? <small>, {stop.country}</small> : null}
      </h3>
      <p className="map-card-line">
        <span className={`tag ${now >= stop.depart ? 'tag-ok' : 'tag-live'}`}>{status}</span>
      </p>
      <p className="map-card-line">
        Ankomst kl. <strong className="mono">{fmtTime(stop.arrive)}</strong> dansk tid
        {tz && fmtTimeIn(stop.arrive, tz) !== fmtTime(stop.arrive) ? (
          <>
            {' '}
            · <span className="mono">{fmtTimeIn(stop.arrive, tz)}</span> lokal tid
          </>
        ) : null}
      </p>
      {stop.note && <p className="map-card-note">{stop.note}</p>}
    </div>
  );
}
