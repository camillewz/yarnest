import { useId, type ReactNode } from 'react';
import styles from './Field.module.css';

interface FieldProps {
  label: string;
  hint?: string;
  children: (props: { id: string; className: string; 'aria-describedby'?: string }) => ReactNode;
}

/** Libellé + champ, reliés pour l'accessibilité. */
export function Field({ label, hint, children }: FieldProps) {
  const id = useId();
  const hintId = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({
        id,
        className: styles.input ?? '',
        ...(hint ? { 'aria-describedby': hintId } : {}),
      })}
      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}

export const fieldStyles = styles;
