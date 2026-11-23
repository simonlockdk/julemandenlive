import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './Icons';

/** Tilgængelig dialog: fokusfælde, Escape lukker, fokus returneres. */
export function Dialog({
  open,
  onClose,
  labelledBy,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement;
    const el = ref.current;
    const focusables = () =>
      el
        ? Array.from(
            el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
          ).filter((x) => !x.hasAttribute('disabled'))
        : [];
    window.setTimeout(() => (focusables()[0] ?? el)?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      (prevFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        style={wide ? { width: 'min(920px, 100%)' } : undefined}
      >
        <button type="button" className="icon-btn dialog-close" onClick={onClose} aria-label="Luk">
          <IconClose />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
