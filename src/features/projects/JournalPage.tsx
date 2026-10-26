import { useTranslation } from 'react-i18next';
import { useAllJournal, useProjects } from '../../db/hooks';
import { formatDuration } from '../../domain/format';
import { journal } from '../../domain/journal';
import type { Locale } from '../../domain/types';
import { Page, pageStyles } from '../../ui/Page';
import { JournalList } from './Journal';
import styles from './Journal.module.css';

/** Journal tous projets : chaque session terminée, la plus récente en tête. */
export function JournalPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const history = useAllJournal();
  const projects = useProjects();
  const names = new Map((projects ?? []).map((p) => [p.id, p.name]));
  const { entries, totalKnitMs } = history
    ? journal(history.sessions, history.pauses, history.reviews)
    : { entries: [], totalKnitMs: 0 };

  return (
    <Page title={t('screens.journal.title')} nav>
      {history && projects ? (
        <section className={pageStyles.section} aria-label={t('screens.journal.title')}>
          <span className={styles.allTotal} data-testid="journal-total">
            {t('journal.allTotal', { duration: formatDuration(totalKnitMs, locale) })}
          </span>
          <JournalList entries={entries} projectNames={names} />
        </section>
      ) : (
        <p className={pageStyles.muted} role="status">
          {t('app.loading')}
        </p>
      )}
    </Page>
  );
}
