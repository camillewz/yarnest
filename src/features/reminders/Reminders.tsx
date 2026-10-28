import { Coffee } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { safely } from '../../app/toast';
import { useSetting } from '../../db/hooks';
import { chooseAfterR3, markReminderShown } from '../../db/repo';
import { formatReminderDuration } from '../../domain/format';
import {
  continuousKnitStart,
  dueReminder,
  reminderMinutes,
  type ReminderStage,
} from '../../domain/reminders';
import type { Locale, Pause, Session } from '../../domain/types';
import { Button } from '../../ui/Button';
import { FullScreen, Sheet, overlayStyles } from '../../ui/Overlay';
import styles from './Reminders.module.css';

const R1_VISIBLE_MS = 10_000;

interface RemindersProps {
  session: Session;
  pauses: Pause[];
  now: number;
  onPause: () => void;
}

/** R1, R2, R3 (US3.3) : surcouches de E4. Le palier affiché est écrit avant l'affichage,
 * pour qu'un rappel ne revienne pas après un rechargement (RG06). */
export function Reminders({ session, pauses, now, onPause }: RemindersProps) {
  const { t, i18n } = useTranslation();
  const enabled = useSetting('remindersEnabled');
  const [shown, setShown] = useState<{
    stage: ReminderStage;
    minutes: number;
    start: number;
  } | null>(null);
  const writing = useRef(false);

  const due =
    enabled === undefined
      ? null
      : dueReminder({ session, pauses, now, remindersEnabled: enabled.value !== false });
  const start = continuousKnitStart(session, pauses);

  useEffect(() => {
    if (due === null || start === null || writing.current) return;
    writing.current = true;
    const at = Date.now();
    void safely(() => markReminderShown(session.id, due, at)).finally(() => {
      writing.current = false;
    });
    setShown({ stage: due, minutes: reminderMinutes(due, at, start), start });
  }, [due, start, session.id]);

  useEffect(() => {
    if (shown?.stage !== 1) return;
    const id = window.setTimeout(() => setShown(null), R1_VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [shown]);

  // Une pause (début de tricot continu différent) ferme le rappel affiché.
  if (!shown || shown.start !== start) return null;
  const duration = formatReminderDuration(shown.minutes, i18n.language as Locale);
  const close = () => setShown(null);
  const pause = () => {
    close();
    onPause();
  };

  if (shown.stage === 1) {
    return (
      <div className={styles.banner} role="status">
        <Coffee className={styles.bannerIcon} aria-hidden="true" />
        <p className={styles.bannerText}>{t('reminders.r1', { duration })}</p>
        <Button variant="sage" onClick={pause}>
          {t('reminders.r1Yes')}
        </Button>
      </div>
    );
  }

  if (shown.stage === 2) {
    return (
      <Sheet
        title={t('reminders.r2Title', { duration })}
        description={t('reminders.r2Text')}
        icon={
          <span className={overlayStyles.blob} aria-hidden="true">
            <Coffee />
          </span>
        }
        onClose={close}
      >
        <div className={styles.row}>
          <Button variant="secondary" onClick={close}>
            {t('reminders.later')}
          </Button>
          <Button variant="sage" onClick={pause}>
            {t('reminders.takePause')}
          </Button>
        </div>
      </Sheet>
    );
  }

  const choose = (choice: 'continue' | 'stop') => {
    close();
    void safely(() => chooseAfterR3(session.id, choice));
  };
  return (
    <FullScreen label={t('reminders.r3Title', { duration })} halo="var(--sage-light)">
      <span className={overlayStyles.blob} aria-hidden="true">
        <Coffee />
      </span>
      <h2 className={styles.title}>{t('reminders.r3Title', { duration })}</h2>
      <p className={styles.text}>{t('reminders.r3Text')}</p>
      <div className={styles.actions}>
        <Button variant="sage" block large onClick={pause}>
          {t('reminders.takePause')}
        </Button>
        <Button variant="secondary" block onClick={() => choose('continue')}>
          {t('reminders.r3Continue')}
        </Button>
        <Button variant="secondary" block onClick={() => choose('stop')}>
          {t('reminders.r3Stop')}
        </Button>
      </div>
    </FullScreen>
  );
}
