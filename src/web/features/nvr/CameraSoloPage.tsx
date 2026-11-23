import { Link, useParams } from 'react-router-dom';
import { useApp } from '../../lib/app-context';
import { useDocumentTitle } from '../../lib/hooks';
import { CameraFeed } from './CameraFeed';
import './nvr.css';

/** Ét kamera i sit eget vindue (åbnes fra NVR'en). */
export default function CameraSoloPage() {
  const { id } = useParams();
  const { data, error } = useApp();
  const cam = data?.cameras.find((c) => c.id === id);
  useDocumentTitle(cam ? `${cam.id.toUpperCase()} ${cam.name}` : 'Kamera');

  return (
    <div className="cam-solo-page">
      {error && <p className="empty">{error}</p>}
      {!data && !error && <div className="loading-shimmer" style={{ position: 'absolute', inset: 0 }} />}
      {data && !cam && (
        <div className="empty">
          <p>Kameraet findes ikke.</p>
          <Link to="/overvaagning">Tilbage til overvågningen</Link>
        </div>
      )}
      {cam && <CameraFeed camera={cam} variant="solo" />}
      <Link to={cam ? `/overvaagning?kamera=${cam.id}` : '/overvaagning'} className="btn btn-small cam-solo-back">
        Åbn kontrolcentralen
      </Link>
    </div>
  );
}
