import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconLink } from './IconLink';
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
        {backTo && <IconLink to={backTo} label={t('app.back')} icon={ArrowLeft} />}
        <h1 className={styles.title}>{title}</h1>
        {actions}
      </header>
      {children}
    </main>
  );
}
