import type { CSSProperties } from 'react';
import styles from './Halo.module.css';

/** `color` : une couleur du DS, par exemple `var(--yarn-blue)` (laine du projet). */
export function Halo({ color }: { color?: string | undefined }) {
  const style = color ? ({ '--halo-color': color } as CSSProperties) : undefined;
  return <div className={styles.halo} style={style} aria-hidden="true" />;
}
