import { useId } from 'react';
import { yarnSwatch } from '../domain/display';
import { cx } from './cx';
import styles from './Knit.module.css';

const YARNS = ['terracotta', 'apricot', 'sage', 'blue'] as const;

/** Couleur de laine d'un projet, dérivée de son identifiant (token --yarn-*). */
export const yarnColor = (projectId: string) => `var(--yarn-${YARNS[yarnSwatch(projectId)]})`;

/** Une maille jersey en V, la « touche tricot » du DS. */
export function Stitch({ className }: { className?: string }) {
  return (
    <svg className={cx(styles.stitch, className)} viewBox="0 0 12 14" aria-hidden="true">
      <path d="M6 13.5C2.6 11 1 7 1.2 1 4 3 5.8 7.5 6 13.5Z" />
      <path d="M6 13.5C9.4 11 11 7 10.8 1 8 3 6.2 7.5 6 13.5Z" />
    </svg>
  );
}

/** Texture jersey ton sur ton, posée en fond d'une surface colorée. */
export function KnitTexture({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg className={cx(styles.texture, className)} aria-hidden="true">
      <defs>
        <pattern id={id} width="12" height="10" patternUnits="userSpaceOnUse">
          <path d="M6 11C2.6 8.6 1 5 1.2 0.6 4 2.2 5.8 6 6 11Z" />
          <path d="M6 11C9.4 8.6 11 5 10.8 0.6 8 2.2 6.2 6 6 11Z" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Échantillon de laine du projet (vignette des cartes et de la fiche). */
export function Swatch({ projectId, className }: { projectId: string; className?: string }) {
  return (
    <span
      className={cx(styles.swatch, className)}
      style={{ background: yarnColor(projectId) }}
      aria-hidden="true"
    >
      <KnitTexture />
    </span>
  );
}
