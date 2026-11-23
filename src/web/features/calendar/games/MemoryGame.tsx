import { useEffect, useMemo, useState } from 'react';
import { shuffled, mulberry32 } from '@shared/rng';

const SYMBOLS = ['🎄', '⭐', '🎁', '🦌', '⛄', '🔔', '🕯️', '🍪'];

interface Card {
  id: number;
  symbol: string;
}

export default function MemoryGame() {
  const [round, setRound] = useState(0);
  const cards = useMemo<Card[]>(
    () => shuffled(mulberry32(Date.now() + round), [...SYMBOLS, ...SYMBOLS]).map((symbol, id) => ({ id, symbol })),
    [round],
  );
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped.map((i) => cards[i]!);
    if (a!.symbol === b!.symbol) {
      setMatched((m) => [...m, a!.symbol]);
      setFlipped([]);
    } else {
      const id = window.setTimeout(() => setFlipped([]), 900);
      return () => window.clearTimeout(id);
    }
  }, [flipped, cards]);

  const done = matched.length === SYMBOLS.length;

  return (
    <div className="memory">
      <div className="game-bar">
        <span>Træk: {moves}</span>
        <span>
          Par fundet: {matched.length}/{SYMBOLS.length}
        </span>
        <button
          type="button"
          className="btn btn-small"
          onClick={() => {
            setRound((r) => r + 1);
            setFlipped([]);
            setMatched([]);
            setMoves(0);
          }}
        >
          Nyt spil
        </button>
      </div>
      <div className="memory-grid">
        {cards.map((c, i) => {
          const open = flipped.includes(i) || matched.includes(c.symbol);
          return (
            <button
              key={`${round}-${c.id}`}
              type="button"
              className="memory-card"
              data-open={open}
              data-matched={matched.includes(c.symbol)}
              aria-label={open ? c.symbol : 'Skjult kort'}
              disabled={open || flipped.length === 2}
              onClick={() => {
                setFlipped((f) => [...f, i]);
                if (flipped.length === 1) setMoves((m) => m + 1);
              }}
            >
              <span className="mc-inner">
                <span className="mc-back" aria-hidden="true">
                  ✦
                </span>
                <span className="mc-front" aria-hidden="true">
                  {c.symbol}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {done && (
        <p className="game-win" role="status">
          Flot! Du fandt alle parrene på {moves} træk. Nisserne er imponerede!
        </p>
      )}
    </div>
  );
}
