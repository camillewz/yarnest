import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './Ring.module.css';

const R = 108;
const C = 2 * Math.PI * R;

interface RingProps {
  /** De 0 à 1. */
  progress: number;
  /** `dark` : sur la carte « En cours » (fond --ink). */
  tone?: 'light' | 'dark';
  /** Couture intérieure en pointillés et curseur au bout de l'arc (grand anneau). */
  detailed?: boolean;
  className?: string;
  children?: ReactNode;
}

/** Anneau de session : avance vers la prochaine pause (décor, le texte porte l'information). */
export function Ring({ progress, tone = 'light', detailed, className, children }: RingProps) {
  const p = Math.min(1, Math.max(0, progress));
  const angle = p * 2 * Math.PI - Math.PI / 2;
  return (
    <div className={cx(styles.ring, styles[tone], detailed && styles.detailed, className)}>
      <svg viewBox="0 0 248 248" aria-hidden="true">
        <circle className={styles.track} cx="124" cy="124" r={R} />
        <circle
          className={styles.arc}
          cx="124"
          cy="124"
          r={R}
          strokeDasharray={`${p * C} ${C}`}
          transform="rotate(-90 124 124)"
        />
        {detailed && (
          <>
            <circle className={styles.seam} cx="124" cy="124" r="88" />
            <circle
              className={styles.knob}
              cx={124 + R * Math.cos(angle)}
              cy={124 + R * Math.sin(angle)}
              r="10"
            />
          </>
        )}
      </svg>
      {children && <div className={styles.content}>{children}</div>}
    </div>
  );
}
