import { ArrowLeft, type Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonClass } from './Button';
import { cx } from './cx';
import { FloatingNav } from './FloatingNav';
import { Halo } from './Halo';
import { IconLink } from './IconLink';
import styles from './Page.module.css';

interface PageProps {
  title: ReactNode;
  backTo?: string;
  /** Libellé et icône du bouton retour, « Retour » et flèche par défaut. */
  backLabel?: string;
  backIcon?: Icon;
  actions?: ReactNode;
  children?: ReactNode;
  bottom?: ReactNode;
  /** Couleur du halo de fond (token du DS), terracotta par défaut. */
  halo?: string | undefined;
  /** Titre en grand sous la barre d'en-tête, précédé de `eyebrow` (puces). */
  hero?: boolean;
  eyebrow?: ReactNode;
  /** Titre lu par les lecteurs d'écran seulement (l'écran a son propre en-tête visuel). */
  titleHidden?: boolean;
  /** Navigation flottante des écrans de premier niveau (E1, journal). */
  nav?: boolean;
  /** Titre court centré dans la barre (session). */
  compact?: boolean;
  className?: string;
}

export function Page({
  title,
  backTo,
  backLabel,
  backIcon = ArrowLeft,
  actions,
  children,
  bottom,
  halo,
  hero,
  eyebrow,
  titleHidden,
  nav,
  compact,
  className,
}: PageProps) {
  const { t } = useTranslation();
  const back = backTo && (
    <IconLink to={backTo} label={backLabel ?? t('app.back')} icon={backIcon} />
  );
  const heading = (
    <h1
      className={cx(
        styles.title,
        titleHidden && 'visually-hidden',
        hero && styles.heroTitle,
        compact && styles.compactTitle,
      )}
    >
      {title}
    </h1>
  );
  const bar = hero || titleHidden;
  return (
    <main className={cx(styles.page, nav && styles.withNav, className)}>
      <Halo color={halo} />
      {(back || actions || !bar) && (
        <header className={styles.header}>
          {back}
          {!bar && heading}
          {bar && <span className={styles.spacer} />}
          {actions}
        </header>
      )}
      {hero ? (
        <div className={styles.hero}>
          {eyebrow}
          {heading}
        </div>
      ) : (
        titleHidden && heading
      )}
      {children}
      {bottom && <div className={styles.bottom}>{bottom}</div>}
      {nav && <FloatingNav />}
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
