import { lazy, Suspense, useState } from 'react';
import type { CalendarDoor } from '../../lib/api';
import { useStored } from '../../lib/storage';
import { IconCheck, IconClose } from '../../components/Icons';
import { NisseFigure } from '../../components/Art';
import { Snowglobe, Fireworks, Aurora, NisseDance } from './Animations';

const MemoryGame = lazy(() => import('./games/MemoryGame'));
const CatchGame = lazy(() => import('./games/CatchGame'));
const SnowmanGame = lazy(() => import('./games/SnowmanGame'));

/** Tekst med afsnit adskilt af tomme linjer – vises altid som ren tekst (aldrig HTML). */
function Paragraphs({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="prose">
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i}>
          {p.split('\n').map((line, k, arr) => (
            <span key={k}>
              {line}
              {k < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

function Riddle({ door }: { door: CalendarDoor }) {
  const [shown, setShown] = useState(false);
  const [, setSolved] = useStored<number[]>('loeste-gaader', []);
  return (
    <div className="riddle">
      <p className="riddle-q">{door.question}</p>
      {shown ? (
        <p className="riddle-a" role="status">
          {door.answer}
        </p>
      ) : (
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => {
            setShown(true);
            setSolved((s) => (s.includes(door.day) ? s : [...s, door.day]));
          }}
        >
          Vis svaret
        </button>
      )}
      <p className="hint-text">Tænk dig godt om – eller spørg en voksen, før du kigger!</p>
    </div>
  );
}

function Quiz({ door }: { door: CalendarDoor }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [, setSolved] = useStored<number[]>('loeste-gaader', []);
  const opts = door.options ?? [];
  return (
    <div className="quiz">
      <p className="riddle-q">{door.question}</p>
      <div className="quiz-options" role="group" aria-label="Svarmuligheder">
        {opts.map((o, i) => {
          const state = picked === null ? '' : i === door.correct ? 'correct' : i === picked ? 'wrong' : '';
          return (
            <button
              key={i}
              type="button"
              className="quiz-opt"
              data-state={state}
              disabled={picked !== null}
              onClick={() => {
                setPicked(i);
                if (i === door.correct) setSolved((s) => (s.includes(door.day) ? s : [...s, door.day]));
              }}
            >
              {state === 'correct' && <IconCheck />}
              {state === 'wrong' && <IconClose />}
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className="riddle-a" role="status">
          {picked === door.correct ? 'Rigtigt! ' : 'Ikke helt. '}
          {door.answer}
        </p>
      )}
    </div>
  );
}

function VideoGreeting({ door }: { door: CalendarDoor }) {
  const [failed, setFailed] = useState(false);
  if (door.videoUrl && !failed) {
    return (
      <>
        <Paragraphs text={door.body} />
        <video className="door-video" src={door.videoUrl} poster={door.poster} controls playsInline preload="metadata" onError={() => setFailed(true)} />
      </>
    );
  }
  return (
    <>
      <Paragraphs text={door.body} />
      <div className="video-placeholder">
        <NisseFigure className="vp-nisse" />
        <div>
          <strong>Nisserne klipper stadig filmen …</strong>
          <p>Videohilsenen er på vej fra værkstedet. Kig forbi igen senere!</p>
        </div>
      </div>
    </>
  );
}

export function DoorContent({ door }: { door: CalendarDoor }) {
  switch (door.type) {
    case 'riddle':
      return <Riddle door={door} />;
    case 'quiz':
      return <Quiz door={door} />;
    case 'message':
      return (
        <div className="letter">
          <Paragraphs text={door.body} />
          {door.from && <p className="letter-from">Kærlig hilsen {door.from}</p>}
        </div>
      );
    case 'video':
      return <VideoGreeting door={door} />;
    case 'animation':
      return (
        <>
          <Paragraphs text={door.body} />
          {door.animation === 'snowglobe' && <Snowglobe />}
          {door.animation === 'fireworks' && <Fireworks />}
          {door.animation === 'aurora' && <Aurora />}
          {door.animation === 'dance' && <NisseDance />}
          {door.from && <p className="letter-from">{door.from}</p>}
        </>
      );
    case 'game':
      return (
        <>
          <Paragraphs text={door.body} />
          <Suspense fallback={<div className="loading-shimmer" style={{ height: 300, borderRadius: 12 }} />}>
            {door.game === 'memory' && <MemoryGame />}
            {door.game === 'catch' && <CatchGame />}
            {door.game === 'snowman' && <SnowmanGame />}
          </Suspense>
        </>
      );
    default:
      return (
        <>
          <Paragraphs text={door.body} />
          {door.from && <p className="letter-from">{door.from}</p>}
        </>
      );
  }
}
