import { lazy, Suspense } from 'react';
import { useApp } from '../lib/app-context';
import { useDocumentTitle } from '../lib/hooks';
import { Telemetry } from '../features/map/Telemetry';
import { Timeline } from '../features/map/Timeline';
import { Countdowns } from '../components/Countdowns';
import { AdventWreath } from '../components/AdventWreath';
import { DailyFact, FlightJournal, Logbook, ReindeerTeaser, StatusPanel, WeatherPanel } from '../components/Dashboard';
import { NvrPreview } from '../features/nvr/NvrPreview';
import './home.css';

const SantaMap = lazy(() => import('../features/map/SantaMap'));

export default function HomePage() {
  const { data } = useApp();
  useDocumentTitle('');
  const sec = data?.site.sections;
  const show = (k: keyof NonNullable<typeof sec>) => !sec || sec[k];

  return (
    <div className="home">
      <h1 className="sr-only">{data?.site.heroTitle ?? 'Nordpolens Kontrolcentral'}</h1>
      <div className="control-grid">
        <div className="cg-map">
          <Suspense fallback={<div className="map-shell loading-shimmer" />}>
            <SantaMap />
          </Suspense>
        </div>
        <div className="cg-left">
          <Telemetry />
          <Timeline />
        </div>
        <div className="cg-right">
          {show('countdowns') && <Countdowns />}
          {show('advent') && <AdventWreath />}
        </div>
      </div>

      <div className="hero-intro panel">
        <div>
          <div className="eyebrow">Velkommen</div>
          <h2>{data?.site.heroTitle}</h2>
          <p>{data?.site.heroText}</p>
        </div>
      </div>

      <div className="dash-grid">
        {show('status') && <StatusPanel />}
        {show('logbook') && <Logbook />}
        <div className="dash-stack">
          {show('weather') && <WeatherPanel />}
          {show('fact') && <DailyFact />}
          <ReindeerTeaser />
        </div>
      </div>

      <div className="dash-grid dash-grid-2">
        {show('nvrPreview') && <NvrPreview />}
        {show('journal') && <FlightJournal />}
      </div>
    </div>
  );
}
