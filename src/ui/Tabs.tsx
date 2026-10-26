import type { ReactNode } from 'react';
import styles from './Tabs.module.css';

interface TabsProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}

/** Onglets soulignés servant de filtre (E1). Boutons à bascule : la liste reste dans la page. */
export function Tabs<T extends string>({ label, value, options, onChange }: TabsProps<T>) {
  return (
    <div role="group" aria-label={label} className={styles.tabs}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          className={styles.tab}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
