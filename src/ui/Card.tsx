import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './Card.module.css';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.card, className)} {...props} />;
}

export const cardClass = styles.card;
