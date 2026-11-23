import { useEffect, useMemo, useState } from 'react';
import { useApp, useNow } from '../../lib/app-context';
import { apiGet, type PublicDoor, type CalendarDoor } from '../../lib/api';
import { useDocumentTitle } from '../../lib/hooks';
import { useStored } from '../../lib/storage';
import { Dialog } from '../../components/Dialog';
import { HiddenNisse } from '../../components/HiddenNisse';
import { IconLock, IconStar, IconGift, IconBook, IconSpark, IconCamera, IconBulb, IconMission, IconCalendar } from '../../components/Icons';
import { countdownToDecember, todaysDoor } from '@shared/season';
import { DK_TZ, zonedParts } from '@shared/time';
import { mulberry32, shuffled } from '@shared/rng';
import { DoorContent } from './DoorContent';
import './calendar.css';

const TYPE_ICON = {
  story: IconBook,
  riddle: IconBulb,
  tradition: IconStar,
  game: IconMission,
  animation: IconSpark,
  message: IconGift,
  video: IconCamera,
  quiz: IconBulb,
} as const;

const TYPE_LABEL: Record<CalendarDoor['type'], string> = {
  story: 'Julehistorie',
  riddle: 'Julegåde',
  tradition: 'Juletradition',
  game: 'Spil',
  animation: 'Animation',
  message: 'Hilsen',
  video: 'Videohilsen',
  quiz: 'Julequiz',
};

// Fast "tilfældig" rækkefølge som på en rigtig julekalender
const ORDER = shuffled(mulberry32(1224), Array.from({ length: 24 }, (_, i) => i + 1));
const HUES = ['red', 'green', 'navy', 'gold'] as const;

export function useOpenedDoors() {
  const { clock } = useApp();
  const year = zonedParts(clock.now(), DK_TZ).year;
  return useStored<number[]>(`aabnede-laager-${year}`, []);
}

export default function CalendarPage() {
  const { data } = useApp();
  useDocumentTitle('Julekalender');
  const now = useNow(30_000);
  const [doors, setDoors] = useState<PublicDoor[] | null>(null);
  const [error, setError] = useState(false);
  const [opened, setOpened] = useOpenedDoors();
  const [openingDay, setOpeningDay] = useState<number | null>(null);
  const [shown, setShown] = useState<CalendarDoor | null>(null);
  const today = todaysDoor(now);
  const p = zonedParts(now, DK_TZ);

  // Hent igen ved midnat (nye låger), ellers sjældent
  const dayKey = `${p.year}-${p.month}-${p.day}`;
  useEffect(() => {
    if (!data) return;
    apiGet<{ doors: PublicDoor[] }>('/api/calendar')
      .then((r) => setDoors(r.doors))
      .catch(() => setError(true));
  }, [data, dayKey]);

  const byDay = useMemo(() => new Map((doors ?? []).map((d) => [d.day, d])), [doors]);

  const open = (day: number) => {
    const d = byDay.get(day);
    if (!d || d.locked) return;
    if (!opened.includes(day)) {
      setOpeningDay(day);
      setOpened((prev) => (prev.includes(day) ? prev : [...prev, day]));
      window.setTimeout(() => {
        setOpeningDay(null);
        setShown(d);
      }, 750);
    } else {
      setShown(d);
    }
  };

  const dec = countdownToDecember(now);
  const outOfSeason = p.month !== 12;

  return (
    <div className="calendar-page">
      <div className="page-hero">
        <div>
          <div className="eyebrow">Nissernes julekalender</div>
          <h1>Julekalenderen</h1>
          <p>
            Hver dag i december åbner en ny låge kl. 00.00. Bag lågerne gemmer sig historier, gåder, spil og hilsner fra Nordpolen. Du kan altid åbne de låger, du er gået glip af.
          </p>
        </div>
        <div className="cal-progress">
          <IconCalendar />
          <span>
            <b>{opened.length}</b> af 24 låger åbnet
          </span>
        </div>
      </div>

      {outOfSeason && (
        <div className="banner" style={{ marginBottom: 18 }}>
          <IconLock />
          <div>
            <strong>Kalenderen er låst.</strong> Første låge åbner 1. december – om {dec.remaining.days} dage og {dec.remaining.hours} timer.
          </div>
        </div>
      )}
      {error && <p className="empty">Kalenderen kunne ikke hentes. Prøv igen om lidt.</p>}

      <div className="cal-board">
        <HiddenNisse id="kalender" style={{ right: -6, bottom: -14 }} />
        {ORDER.map((day, i) => {
          const d = byDay.get(day);
          const locked = !d || d.locked;
          const isOpened = opened.includes(day) && !locked;
          const isToday = day === today;
          const hue = HUES[(day * 7 + i) % HUES.length];
          const Icon = d && !d.locked ? TYPE_ICON[d.type] : IconStar;
          return (
            <button
              key={day}
              type="button"
              className={`door door-${hue}${day === 24 ? ' door-big' : ''}`}
              data-locked={locked}
              data-opened={isOpened}
              data-opening={openingDay === day}
              data-today={isToday}
              onClick={() => open(day)}
              disabled={!doors}
              aria-label={
                locked
                  ? `Låge ${day} – låst, åbner ${day}. december`
                  : `Låge ${day}${isToday ? ', dagens låge' : ''}${isOpened ? ` – ${TYPE_LABEL[d.type]}, allerede åbnet` : ' – klik for at åbne'}`
              }
            >
              <span className="door-inside" aria-hidden="true">
                <Icon />
                {d && !d.locked && <small>{TYPE_LABEL[d.type]}</small>}
              </span>
              <span className="door-leaf" aria-hidden="true">
                <span className="door-num">{day}</span>
                {locked ? <IconLock className="door-lock" /> : isToday && !isOpened ? <span className="door-today">I dag!</span> : null}
                <span className="door-knob" />
              </span>
            </button>
          );
        })}
      </div>

      <Dialog open={!!shown} onClose={() => setShown(null)} labelledBy="laage-titel" wide={shown?.type === 'game'}>
        {shown && (
          <div className="door-content">
            <div className="eyebrow">
              Låge {shown.day} · {TYPE_LABEL[shown.type]}
            </div>
            <h2 id="laage-titel">{shown.title}</h2>
            <DoorContent door={shown} />
          </div>
        )}
      </Dialog>
    </div>
  );
}
