import { NotebookText, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router';
import { NestIcon } from './NestIcon';
import styles from './FloatingNav.module.css';

/** Navigation flottante des écrans de premier niveau : projets, création, journal. */
export function FloatingNav() {
  const { t } = useTranslation();
  return (
    <>
      <div className={styles.fade} aria-hidden="true" />
      <nav className={styles.nav} aria-label={t('nav.label')}>
        <NavLink to="/" end className={styles.item}>
          <NestIcon className={styles.icon} />
          {t('nav.projects')}
        </NavLink>
        <Link to="/projects/new" className={styles.create} aria-label={t('projects.new')}>
          <Plus aria-hidden="true" />
        </Link>
        <NavLink to="/journal" className={styles.item}>
          <NotebookText className={styles.icon} aria-hidden="true" />
          {t('nav.journal')}
        </NavLink>
      </nav>
    </>
  );
}
