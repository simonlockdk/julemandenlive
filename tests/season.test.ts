import { describe, expect, it } from 'vitest';
import {
  adventSundays,
  adventState,
  countdownToChristmasEve,
  countdownToDecember,
  isDoorUnlocked,
  seasonMode,
  todaysDoor,
} from '../src/shared/season';
import { dkMidnight, zonedParts, zonedTimeToUtc } from '../src/shared/time';

const dk = (y: number, m: number, d: number, h = 0, mi = 0, s = 0) =>
  zonedTimeToUtc(y, m, d, h, mi, s, 'Europe/Copenhagen');

describe('tidszoner', () => {
  it('omregner dansk vintertid og sommertid korrekt', () => {
    expect(new Date(dk(2026, 12, 24, 0)).toISOString()).toBe('2026-12-23T23:00:00.000Z');
    expect(new Date(dk(2026, 7, 1, 12)).toISOString()).toBe('2026-07-01T10:00:00.000Z');
  });
  it('håndterer dagsoverløb (32. december = 1. januar)', () => {
    expect(dkMidnight(2026, 12, 32)).toBe(dk(2027, 1, 1));
  });
  it('zonedParts giver dansk kalenderdato tæt på midnat', () => {
    const p = zonedParts(Date.parse('2026-11-30T23:30:00Z'));
    expect([p.year, p.month, p.day, p.hour]).toEqual([2026, 12, 1, 0]);
  });
});

describe('adventssøndage', () => {
  const fmt = (y: number) => adventSundays(y).map((d) => `${d.month}-${d.day}`);
  it.each([
    [2024, ['12-1', '12-8', '12-15', '12-22']],
    [2025, ['11-30', '12-7', '12-14', '12-21']],
    [2026, ['11-29', '12-6', '12-13', '12-20']],
    [2027, ['11-28', '12-5', '12-12', '12-19']],
    [2028, ['12-3', '12-10', '12-17', '12-24']], // juleaften er en søndag
    [2033, ['11-27', '12-4', '12-11', '12-18']], // 24/12 er lørdag → tidligst mulige 1. advent
  ])('%i', (year, expected) => {
    expect(fmt(year)).toEqual(expected);
  });

  it('tænder det rigtige antal lys', () => {
    expect(adventState(dk(2026, 11, 28, 23, 59)).lit).toBe(0);
    expect(adventState(dk(2026, 11, 29, 0, 0)).lit).toBe(1);
    expect(adventState(dk(2026, 12, 5, 12)).lit).toBe(1);
    expect(adventState(dk(2026, 12, 6, 8)).lit).toBe(2);
    expect(adventState(dk(2026, 12, 13, 8)).lit).toBe(3);
    expect(adventState(dk(2026, 12, 20, 8)).lit).toBe(4);
    expect(adventState(dk(2026, 12, 24, 20)).lit).toBe(4);
    expect(adventState(dk(2026, 12, 26, 20)).lit).toBe(4);
    expect(adventState(dk(2026, 12, 27, 1)).lit).toBe(0);
    expect(adventState(dk(2027, 3, 1)).lit).toBe(0);
  });

  it('kender næste adventssøndag', () => {
    expect(adventState(dk(2026, 11, 22)).next).toEqual({ year: 2026, month: 11, day: 29 });
    expect(adventState(dk(2026, 12, 21)).next).toBeNull();
  });
});

describe('nedtællinger', () => {
  it('tæller ned til 1. december', () => {
    const c = countdownToDecember(dk(2026, 11, 22, 12, 0, 0));
    expect(c.phase).toBe('counting');
    expect(c.remaining.days).toBe(8);
    expect(c.remaining.hours).toBe(12);
    expect(c.target).toBe(dk(2026, 12, 1));
  });
  it('er "nået" i hele kalenderperioden og tæller mod næste år bagefter', () => {
    expect(countdownToDecember(dk(2026, 12, 1, 0, 0, 0)).phase).toBe('reached');
    expect(countdownToDecember(dk(2026, 12, 24, 23, 59)).phase).toBe('reached');
    const after = countdownToDecember(dk(2026, 12, 25, 0, 0, 1));
    expect(after.phase).toBe('counting');
    expect(after.targetYear).toBe(2027);
  });
  it('sekundet før midnat', () => {
    const c = countdownToChristmasEve(dk(2026, 12, 23, 23, 59, 59));
    expect(c.phase).toBe('counting');
    expect(c.remaining).toMatchObject({ days: 0, hours: 0, minutes: 0, seconds: 1 });
  });
  it('juleaften er "nået" hele dagen, derefter afslutning + næste års nedtælling', () => {
    expect(countdownToChristmasEve(dk(2026, 12, 24, 18)).phase).toBe('reached');
    const c = countdownToChristmasEve(dk(2026, 12, 25, 10));
    expect(c.phase).toBe('counting');
    expect(c.afterglow).toBe(true);
    expect(c.targetYear).toBe(2027);
    expect(c.remaining.days).toBe(363);
  });
  it('håndterer årsskiftet', () => {
    const nye = countdownToChristmasEve(dk(2027, 1, 1, 0, 0, 0));
    expect(nye.afterglow).toBe(false);
    expect(nye.targetYear).toBe(2027);
    const nytaarsaften = countdownToChristmasEve(dk(2026, 12, 31, 23, 59, 59));
    expect(nytaarsaften.afterglow).toBe(true);
    expect(nytaarsaften.target).toBe(dk(2027, 12, 24));
  });
  it('skudår påvirker ikke resultatet', () => {
    const c = countdownToChristmasEve(dk(2028, 2, 29, 0));
    expect(c.target).toBe(dk(2028, 12, 24));
  });
});

describe('julekalenderen', () => {
  it('åbner låger kl. 00:00 dansk tid', () => {
    expect(isDoorUnlocked(1, Date.parse('2026-11-30T22:59:59Z'))).toBe(false);
    expect(isDoorUnlocked(1, Date.parse('2026-11-30T23:00:00Z'))).toBe(true);
    expect(isDoorUnlocked(2, Date.parse('2026-11-30T23:00:00Z'))).toBe(false);
  });
  it('viser tidligere låger og hele kalenderen efter juleaften', () => {
    expect(isDoorUnlocked(5, dk(2026, 12, 10))).toBe(true);
    expect(isDoorUnlocked(24, dk(2026, 12, 27))).toBe(true);
  });
  it('er lukket fra januar til november', () => {
    expect(isDoorUnlocked(1, dk(2027, 1, 2))).toBe(false);
    expect(isDoorUnlocked(1, dk(2026, 11, 22))).toBe(false);
  });
  it('kender dagens låge', () => {
    expect(todaysDoor(dk(2026, 12, 13, 15))).toBe(13);
    expect(todaysDoor(dk(2026, 12, 25, 15))).toBeNull();
  });
});

describe('sæsontilstand', () => {
  it.each([
    [dk(2026, 3, 1), 'completed'],
    [dk(2026, 10, 1), 'preparation'],
    [dk(2026, 11, 30, 23, 59), 'preparation'],
    [dk(2026, 12, 1), 'advent'],
    [dk(2026, 12, 23, 23, 59), 'advent'],
    [dk(2026, 12, 24), 'christmas-eve'],
    [dk(2026, 12, 25), 'completed'],
  ])('%i → %s', (t, mode) => {
    expect(seasonMode(t)).toBe(mode);
  });
});
