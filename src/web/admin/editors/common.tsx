import type { ReactNode } from 'react';
import type { SaveState } from '../useAdminData';

export function SaveBar({ dirty, save, onSave, onReset }: { dirty: boolean; save: SaveState; onSave: () => void; onReset: () => void }) {
  return (
    <div className="save-bar" data-dirty={dirty}>
      <div className="save-msg" role="status" aria-live="polite">
        {save.message && <span className={save.ok ? 'ok' : 'err'}>{save.message}</span>}
        {!save.message && dirty && <span>Du har ændringer, der ikke er gemt.</span>}
        {save.issues.length > 0 && (
          <ul className="issues">
            {save.issues.map((i, k) => (
              <li key={k}>{i}</li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" className="btn btn-small" onClick={onReset} disabled={!dirty || save.saving}>
        Fortryd
      </button>
      <button type="button" className="btn btn-primary btn-small" onClick={onSave} disabled={!dirty || save.saving}>
        {save.saving ? 'Gemmer …' : 'Gem ændringer'}
      </button>
    </div>
  );
}

export function Field({ label, hint, children, id }: { label: string; hint?: string; children: ReactNode; id?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="panel admin-section">
      <div className="admin-section-head">
        <h2>{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Loading({ error }: { error: string | null }) {
  if (error) return <p className="admin-error">Kunne ikke hente data: {error}</p>;
  return <div className="loading-shimmer" style={{ height: 200, borderRadius: 12 }} />;
}

/** Opdaterer ét element i en liste uforanderligt. */
export function updateAt<T>(list: T[], i: number, patch: Partial<T>): T[] {
  return list.map((x, k) => (k === i ? { ...x, ...patch } : x));
}
