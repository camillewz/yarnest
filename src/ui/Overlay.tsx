import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { cx } from './cx';
import { Halo } from './Halo';
import styles from './Overlay.module.css';

function useFocusOnOpen(onEscape?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(
      'button:not([disabled]), input, select, textarea, [href]',
    );
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onEscape]);
  return ref;
}

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Pastille illustrée à gauche du titre, et texte d'accompagnement (rappels). */
  icon?: ReactNode;
  description?: string;
}

/** Feuille montante depuis le bas (pause, rappel R2, détail du journal). */
export function Sheet({ title, onClose, children, icon, description }: SheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const ref = useFocusOnOpen(onClose);
  return createPortal(
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={styles.sheet}
      >
        <div className={styles.sheetHeader}>
          {icon}
          <div className={styles.sheetTitle}>
            <h2 id={titleId}>{title}</h2>
            {description && (
              <p id={descriptionId} className={styles.description}>
                {description}
              </p>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmDialogProps {
  title: string;
  message?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation obligatoire (remise à zéro, suppression, fin de session). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const ref = useFocusOnOpen(onCancel);
  return createPortal(
    <div className={cx(styles.backdrop, styles.dialogBackdrop)}>
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        className={styles.dialog}
      >
        <h2 id={titleId}>{title}</h2>
        {message && <p id={messageId}>{message}</p>}
        <div className={styles.actions}>
          <Button variant="secondary" block onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} block onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Écran plein (pause E5, rappel R3). */
export function FullScreen({
  label,
  children,
  halo,
  className,
}: {
  label: string;
  children: ReactNode;
  /** Couleur du halo de fond (token du DS). */
  halo?: string;
  className?: string;
}) {
  const ref = useFocusOnOpen();
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={cx(styles.fullscreen, className)}
    >
      <Halo color={halo} />
      {children}
    </div>,
    document.body,
  );
}

export const overlayStyles = styles;
