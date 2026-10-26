import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { safely } from '../../app/toast';
import { useProjectHistory } from '../../db/hooks';
import { deleteSession, setManualKnitTime } from '../../db/repo';
import { formatDuration } from '../../domain/format';
import { journal, type JournalEntry } from '../../domain/journal';
import type { Locale } from '../../domain/types';
import { dayParts, shortDate } from '../../i18n/dates';
import { Button, buttonClass } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { ConfirmDialog, Sheet } from '../../ui/Overlay';
import { pageStyles } from '../../ui/Page';
import styles from './Journal.module.css';

/** Journal de la fiche projet (US6.1). */
export function Journal({ projectId }: { projectId: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const history = useProjectHistory(projectId);
  if (!history) return null;

  const { entries, totalKnitMs } = journal(history.sessions, history.pauses, history.reviews);

  return (
    <section className={pageStyles.section} aria-labelledby="journal-title">
      <div className={styles.header}>
        <h2 id="journal-title">{t('journal.title')}</h2>
        <span className={styles.total} data-testid="journal-total">
          {t('journal.total', { duration: formatDuration(totalKnitMs, locale) })}
        </span>
      </div>
      <JournalList entries={entries} />
    </section>
  );
}

/** Lignes du journal, détail éditable au tap. `projectNames` : journal tous projets. */
export function JournalList({
  entries,
  projectNames,
}: {
  entries: JournalEntry[];
  projectNames?: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = entries.find((e) => e.session.id === openId);
  if (entries.length === 0) return <p className={pageStyles.muted}>{t('journal.empty')}</p>;
  return (
    <>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.session.id}>
            <button
              type="button"
              className={styles.entry}
              onClick={() => setOpenId(entry.session.id)}
            >
              <EntryLine entry={entry} project={projectNames?.get(entry.session.projectId)} />
            </button>
          </li>
        ))}
      </ul>
      {open && <EntryDetail entry={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function EntryLine({ entry, project }: { entry: JournalEntry; project?: string | undefined }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { session, times, review } = entry;
  const day = dayParts(session.startedAt, locale);
  const parts = [
    t('journal.knit', { duration: formatDuration(times.knitMs, locale) }) +
      (session.manualKnitSeconds !== undefined ? ` (${t('journal.corrected')})` : ''),
    t('journal.pause', { duration: formatDuration(times.pauseMs, locale) }),
  ];
  return (
    <>
      <span className={styles.date} aria-hidden="true">
        <span className={styles.weekday}>{day.weekday}</span>
        <span className={styles.dayNumber}>{day.day}</span>
      </span>
      <span className="visually-hidden">{shortDate(session.startedAt, locale)}</span>
      <span className={styles.body}>
        {project && <span className={styles.project}>{project}</span>}
        <span className={styles.detail}>{parts.join(' · ')}</span>
        {(review?.mood || (review && review.zones.length > 0)) && (
          <span className={styles.review}>
            {review.mood && (
              <span
                className={styles.mood}
                role="img"
                aria-label={t('journal.mood', { value: review.mood })}
              >
                {'●'.repeat(review.mood)}
                {'○'.repeat(5 - review.mood)}
              </span>
            )}
            {review.zones.length > 0 && (
              <span>{review.zones.map((z) => t(`review.${z}`)).join(', ')}</span>
            )}
          </span>
        )}
      </span>
      {entry.rowsDone !== undefined && (
        <span className={styles.rows}>{t('journal.rowsDone', { count: entry.rowsDone })}</span>
      )}
    </>
  );
}

/** Détail éditable : durée de tricot, bilan, suppression (US6.2). */
function EntryDetail({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const totalMinutes = Math.floor(entry.times.knitMs / 60_000);
  const [hours, setHours] = useState(String(Math.floor(totalMinutes / 60)));
  const [minutes, setMinutes] = useState(String(totalMinutes % 60));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const id = entry.session.id;

  const parsed = Number(hours) * 3600 + Number(minutes) * 60;
  const valid =
    Number.isInteger(Number(hours)) &&
    Number.isInteger(Number(minutes)) &&
    Number(hours) >= 0 &&
    Number(minutes) >= 0 &&
    Number(minutes) < 60;

  return (
    <Sheet
      title={t('journal.detailTitle', { date: shortDate(entry.session.startedAt, locale) })}
      onClose={onClose}
    >
      <div className={styles.detail}>
        <fieldset className={styles.time}>
          <legend>{t('journal.knitTime')}</legend>
          <Field label={t('journal.hours')}>
            {(props) => (
              <input
                {...props}
                type="number"
                inputMode="numeric"
                min={0}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            )}
          </Field>
          <Field label={t('journal.minutes')}>
            {(props) => (
              <input
                {...props}
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            )}
          </Field>
        </fieldset>
        <Button
          variant="secondary"
          block
          disabled={!valid}
          onClick={() => {
            void safely(() => setManualKnitTime(id, parsed));
            onClose();
          }}
        >
          {t('journal.saveTime')}
        </Button>
        <Link to={`/sessions/${id}/review`} className={buttonClass('secondary', true)}>
          {entry.review ? t('journal.editReview') : t('journal.addReview')}
        </Link>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          {t('journal.delete')}
        </Button>
      </div>
      {confirmDelete && (
        <ConfirmDialog
          title={t('journal.deleteTitle')}
          message={t('journal.deleteMessage')}
          confirmLabel={t('journal.deleteConfirm')}
          cancelLabel={t('app.cancel')}
          danger
          onConfirm={() => {
            setConfirmDelete(false);
            onClose();
            void safely(() => deleteSession(id));
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </Sheet>
  );
}
