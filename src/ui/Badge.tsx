import type { ProjectStatus } from '../domain/types';
import { cx } from './cx';
import styles from './Badge.module.css';

export type BadgeTone = 'active' | 'neutral';

export function Badge({ label, tone }: { label: string; tone?: BadgeTone | undefined }) {
  return <span className={cx(styles.badge, tone && styles[tone])}>{label}</span>;
}

/** Statut d'un projet : sauge « en cours », terracotta « à faire », neutre sinon. */
export const statusTone = (status: ProjectStatus): BadgeTone | undefined =>
  status === 'active' ? 'active' : status === 'todo' ? undefined : 'neutral';
