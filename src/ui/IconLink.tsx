import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import styles from './Page.module.css';

interface IconLinkProps {
  to: string;
  label: string;
  icon: PhosphorIcon;
}

export function IconLink({ to, label, icon: Icon }: IconLinkProps) {
  return (
    <Link to={to} className={styles.iconLink} aria-label={label}>
      <Icon aria-hidden="true" />
    </Link>
  );
}
