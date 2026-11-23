import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../lib/hooks';
import './pages.css';

export default function AboutPage() {
  useDocumentTitle('Om siden');
  return (
    <div className="about prose">
      <div className="page-hero">
        <div>
          <div className="eyebrow">Om Nordpolens Kontrolcentral</div>
          <h1>Et magisk vindue til Nordpolen</h1>
          <p>Nordpolens Kontrolcentral er en hyggelig juleportal for børn og voksne – lavet for sjov og fantasi.</p>
        </div>
      </div>
      <div className="about-grid">
        <section className="panel">
          <h2>Er det rigtigt?</h2>
          <p>
            Kanens position, flydata, kameraer, vejr og driftsstatus er en <strong>magisk simulation</strong>. Der bruges ingen rigtige GPS-data, og
            kameraerne er ikke rigtig overvågning – de viser animationer og forudproducerede videoer fra Nordpolens fantasiverden.
          </p>
          <p>
            Alt beregnes ud fra tiden, så alle, der kigger med, ser kanen det samme sted og de samme sjove hændelser på kameraerne på samme tid.
          </p>
        </section>
        <section className="panel">
          <h2>Privatliv</h2>
          <p>
            Siden bruger <strong>ingen cookies</strong> til besøgende, ingen sporing og ingen reklamer. Vi indsamler ingen personoplysninger.
          </p>
          <p>
            Ting som åbnede kalenderlåger, din ønskeseddel, fundne nisser og dine indstillinger gemmes kun lokalt i din egen browser (localStorage). Du kan slette
            dem når som helst ved at rydde browserens data for siden.
          </p>
        </section>
        <section className="panel">
          <h2>Kort og kilder</h2>
          <p>
            Kortet er tegnet med det åbne kortbibliotek MapLibre og kortdata fra{' '}
            <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">
              OpenFreeMap
            </a>{' '}
            ©{' '}
            <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">
              OpenMapTiles
            </a>{' '}
            og{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              OpenStreetMap-bidragydere
            </a>
            .
          </p>
          <p>Alle illustrationer, animationer og tekster på siden er lavet specielt til Nordpolens Kontrolcentral.</p>
        </section>
        <section className="panel">
          <h2>Gode råd til voksne</h2>
          <p>
            Julemanden kommer forbi byerne juleaften omkring kl. 18–20 lokal tid. I december flyver han små prøveflyvninger de fleste eftermiddage – hold øje med
            kortet!
          </p>
          <p>
            Man kan slå sne og nissealarmer fra nederst på siden. Siden respekterer også indstillingen for reduceret bevægelse i styresystemet.
          </p>
          <p>
            <Link to="/">Tilbage til kontrolcentralen</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
