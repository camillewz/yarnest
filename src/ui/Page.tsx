import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonClass } from './Button';
import { IconLink } from './IconLink';
import styles from './Page.module.css';

interface PageProps {
  title: ReactNode;
  backTo?: string;
  actions?: ReactNode;
  children?: ReactNode;
  bottom?: ReactNode;
}

export function Page({ title, backTo, actions, children, bottom }: PageProps) {
  const { t } = useTranslation();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        {backTo && <IconLink to={backTo} label={t('app.back')} icon={ArrowLeft} />}
        <h1 className={styles.title}>{title}</h1>
        {actions}
      </header>
      {children}
      {bottom && <div className={styles.bottom}>{bottom}</div>}
    </main>
  );
}

/** Chargement (lecture IndexedDB) ou élément introuvable. */
export function PageMessage({ title, message }: { title: string; message?: string }) {
  const { t } = useTranslation();
  return (
    <Page title={title} backTo="/">
      {message ? (
        <div className={styles.center}>
          <p>{message}</p>
          <Link to="/" className={buttonClass('secondary')}>
            {t('errors.backHome')}
          </Link>
        </div>
      ) : (
        <p className={styles.muted} role="status">
          {t('app.loading')}
        </p>
      )}
    </Page>
  );
}

export const pageStyles = styles;
