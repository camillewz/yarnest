import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import styles from './Page.module.css';

interface PageProps {
  title: string;
  backTo?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function Page({ title, backTo, actions, children }: PageProps) {
  const { t } = useTranslation();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        {backTo && (
          <Link to={backTo} className={styles.iconLink} aria-label={t('app.back')}>
            <span aria-hidden="true">←</span>
          </Link>
        )}
        <h1 className={styles.title}>{title}</h1>
        {actions}
      </header>
      {children}
    </main>
  );
}
