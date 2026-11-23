import { Link } from 'react-router-dom';
import { SleighArt } from '../components/Art';
import { useDocumentTitle } from '../lib/hooks';

export default function NotFoundPage() {
  useDocumentTitle('Siden findes ikke');
  return (
    <div className="panel" style={{ textAlign: 'center', padding: '48px 20px', maxWidth: 640, margin: '20px auto' }}>
      <SleighArt style={{ width: 220, margin: '0 auto 16px' }} />
      <h1>Ups – kanen er fløjet forkert!</h1>
      <p>Den side, du leder efter, findes ikke på Nordpolen. Måske har en nisse flyttet den?</p>
      <Link to="/" className="btn btn-primary">
        Tilbage til kontrolcentralen
      </Link>
    </div>
  );
}
