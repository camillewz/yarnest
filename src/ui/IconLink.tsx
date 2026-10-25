import { Link } from 'react-router';
import styles from './Page.module.css';

interface IconLinkProps {
  to: string;
  label: string;
  icon: string;
}

export function IconLink({ to, label, icon }: IconLinkProps) {
  return (
    <Link to={to} className={styles.iconLink} aria-label={label}>
      <span aria-hidden="true">{icon}</span>
    </Link>
  );
}
