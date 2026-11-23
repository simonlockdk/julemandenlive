import { Link, useNavigate } from 'react-router-dom';
import { useApp, useNow } from '../../lib/app-context';
import { CameraFeed } from './CameraFeed';
import { IconCamera } from '../../components/Icons';
import './nvr.css';

/** To kameraer på forsiden – skifter hver time. */
export function NvrPreview() {
  const { data } = useApp();
  const now = useNow(60_000);
  const navigate = useNavigate();
  const cams = (data?.cameras ?? []).filter((c) => c.status !== 'offline');
  if (cams.length === 0) return null;
  const h = Math.floor(now / 3_600_000);
  const a = cams[h % cams.length]!;
  const b = cams[(h + 3) % cams.length]!;
  const pick = a.id === b.id ? [a] : [a, b];
  return (
    <section className="panel nvr-preview" aria-labelledby="nvr-preview-titel">
      <div className="panel-head">
        <h2 id="nvr-preview-titel">
          <IconCamera className="icon" /> Fra overvågningen
        </h2>
        <Link to="/overvaagning" className="btn btn-small tag-btn">
          Alle 8 kameraer
        </Link>
      </div>
      <div className="nvr-preview-grid">
        {pick.map((c) => (
          <CameraFeed key={c.id} camera={c} variant="tile" actions={false} onSelect={() => navigate(`/overvaagning?kamera=${c.id}`)} />
        ))}
      </div>
    </section>
  );
}
