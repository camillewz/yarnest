import { cx } from './cx';
import styles from './Badge.module.css';

export function Badge({ label, tone }: { label: string; tone?: 'active' }) {
  return <span className={cx(styles.badge, tone && styles[tone])}>{label}</span>;
}
