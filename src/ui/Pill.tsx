import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import styles from './Pill.module.css';

interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
}

/** Puce à bascule (filtres E1, zones du bilan). */
export function Pill({ selected, className, ...props }: PillProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(styles.pill, className)}
      {...props}
    />
  );
}

export function PillGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className={styles.group}>
      {children}
    </div>
  );
}
