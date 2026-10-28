import { Coffee } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatClock, formatDuration } from '../../domain/format';
import { pauseCountdown } from '../../domain/pauses';
import type { Locale, Pause } from '../../domain/types';
import { Button } from '../../ui/Button';
import { FullScreen, overlayStyles } from '../../ui/Overlay';
import { Ring } from '../../ui/Ring';
import { chime, vibrate } from './feedback';
import styles from './PauseScreen.module.css';

interface PauseScreenProps {
  pause: Pause;
  now: number;
  knitMs: number;
  rowCount: number;
  onEnd: () => void;
  onIncrementRow: () => void;
}

/** E5 — Pause plein écran. La reprise est toujours manuelle ; le dépassement compte en pause. */
export function PauseScreen({
  pause,
  now,
  knitMs,
  rowCount,
  onEnd,
  onIncrementRow,
}: PauseScreenProps) {
  const { t, i18n } = useTranslation();
  const countdown = pauseCountdown(pause, now);
  const wasFinished = useRef(countdown.finished);

  // Son et vibration seulement si la fin survient sous nos yeux, pas au retour d'arrière-plan.
  useEffect(() => {
    if (countdown.finished && !wasFinished.current && document.visibilityState === 'visible') {
      chime();
      vibrate([200, 100, 200]);
    }
    wasFinished.current = countdown.finished;
  }, [countdown.finished]);

  const overrunMinutes = Math.floor(countdown.overrunMs / 60_000);
  const plannedMs = pause.plannedMinutes * 60_000;

  return (
    <FullScreen label={t('pause.title')} halo="var(--sage-light)">
      {countdown.finished ? (
        <>
          <span className={overlayStyles.blob} aria-hidden="true">
            <Coffee />
          </span>
          <p className={styles.finished} role="alert">
            {t('pause.finishedTitle')}
          </p>
          {overrunMinutes >= 1 && (
            <p className={styles.muted}>
              {t('pause.finishedAgo', {
                duration: formatDuration(countdown.overrunMs, i18n.language as Locale),
              })}
            </p>
          )}
        </>
      ) : (
        <Ring progress={1 - countdown.remainingMs / plannedMs} detailed className={styles.ring}>
          <span className="eyebrow">{t('pause.title')}</span>
          <span className="counter" role="timer" aria-label={t('pause.remaining')}>
            {formatClock(countdown.remainingMs)}
          </span>
        </Ring>
      )}
      <p className={styles.muted}>{t('pause.frozen', { time: formatClock(knitMs) })}</p>
      <div className={styles.actions}>
        {countdown.finished ? (
          <Button variant="primary" block large onClick={onEnd}>
            {t('pause.resume')}
          </Button>
        ) : (
          <Button variant="secondary" block onClick={onEnd}>
            {t('pause.stop')}
          </Button>
        )}
        <Button variant="ghost" block onClick={onIncrementRow}>
          {t('session.rowZone', { count: rowCount })}
        </Button>
      </div>
    </FullScreen>
  );
}
