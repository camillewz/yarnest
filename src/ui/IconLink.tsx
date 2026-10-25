import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import styles from './Page.module.css';

interface IconLinkProps {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function IconLink({ to, label, icon: Icon }: IconLinkProps) {
  return (
    <Link to={to} className={styles.iconLink} aria-label={label}>
      <Icon aria-hidden="true" />
    </Link>
  );
}
