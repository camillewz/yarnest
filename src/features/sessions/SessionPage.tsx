import { ArrowCounterClockwise, CaretDown, Pause as PauseIcon, Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';
import { useNow } from '../../app/clock';
import { safely } from '../../app/toast';
import { useActiveSession, usePauses, useProject, useSetting } from '../../db/hooks';
import { applyCounter, endPause, endSession, startPause } from '../../db/repo';
import { formatClock, formatDuration } from '../../domain/format';
import { DEFAULT_PAUSE_MINUTES, findOpenPause } from '../../domain/pauses';
import { pauseRing } from '../../domain/reminders';
import { sessionTimes } from '../../domain/time';
import type { Locale, Pause, Project, Session } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { KnitTexture } from '../../ui/Knit';
import { ConfirmDialog } from '../../ui/Overlay';
import { Page, PageMessage } from '../../ui/Page';
import { Ring } from '../../ui/Ring';
import { Stepper } from '../../ui/Stepper';
import { unlockAudio, vibrate } from '../pauses/feedback';
import { PauseScreen } from '../pauses/PauseScreen';
import { PauseSheet } from '../pauses/PauseSheet';
import { SessionExtras } from './SessionExtras';
import { useWakeLock } from './useWakeLock';
import styles from './Session.module.css';

/** E4 — Session en cours ; E5 (pause) s'affiche en plein écran sur cette même route. */
export function SessionPage() {
  const { t } = useTranslation();
  const active = useActiveSession();
  const session = active?.value;
  const project = useProject(session?.projectId);
  const pauses = usePauses(session?.id);
  const [ending, setEnding] = useState(false);

  if (!active || (session && (!project || !pauses))) {
    return <PageMessage title={t('screens.session.title')} />;
  }
  if (!session || !project?.value || !pauses) {
    return ending ? null : <Navigate to="/" replace />;
  }
  return (
    <SessionScreen
      session={session}
      project={project.value}
      pauses={pauses}
      onEnding={() => setEnding(true)}
    />
  );
}

interface SessionScreenProps {
  session: Session;
  project: Project;
  pauses: Pause[];
  onEnding: () => void;
}

function SessionScreen({ session, project, pauses, onEnding }: SessionScreenProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const navigate = useNavigate();
  const now = useNow();
  const defaultPause = useSetting('defaultPauseMinutes');
  const reminders = useSetting('remindersEnabled');
  const [pauseSheet, setPauseSheet] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  useWakeLock(true);

  const times = sessionTimes(session, pauses, now);
  const openPause = findOpenPause(pauses, session.id);
  const ring = pauseRing({ session, pauses, now, remindersEnabled: reminders?.value !== false });

  const counter = (action: Parameters<typeof applyCounter>[1]) =>
    void safely(() => applyCounter(project.id, action, Date.now()));

  function incrementRow() {
    vibrate(15);
    counter('incrementRow');
  }

  function openPauseSheet() {
    unlockAudio();
    setPauseSheet(true);
  }

  async function launchPause(minutes: number) {
    setPauseSheet(false);
    await safely(() => startPause(session.id, minutes, Date.now()));
  }

  async function finish() {
    setConfirmEnd(false);
    onEnding();
    const ok = await safely(async () => {
      await endSession(session.id, Date.now());
      return true;
    });
    if (ok) navigate(`/sessions/${session.id}/review`, { replace: true });
  }

  return (
    <Page
      title={project.name}
      backTo={`/projects/${project.id}`}
      backLabel={t('session.minimize')}
      backIcon={CaretDown}
      compact
      halo="var(--sage-light)"
      className={styles.screen}
      actions={
        <Button variant="glass" onClick={() => setConfirmEnd(true)}>
          {t('session.end')}
        </Button>
      }
    >
      <SessionExtras
        session={session}
        project={project}
        pauses={pauses}
        now={now}
        onPause={openPauseSheet}
      />

      <section className={styles.times} aria-label={t('screens.session.title')}>
        <Ring progress={ring?.progress ?? 0} detailed className={styles.ring}>
          <span className="eyebrow">{t('session.knitLabel')}</span>
          <span className="counter" data-testid="knit-time">
            {formatClock(times.knitMs)}
          </span>
          {ring?.reminder && (
            <span className={styles.nextPause}>
              {ring.remainingMs > 0
                ? t('session.nextPause', {
                    // Minute entamée : « pause dans 1 min » jusqu’au rappel.
                    duration: formatDuration(Math.ceil(ring.remainingMs / 60_000) * 60_000, locale),
                  })
                : t('session.nextPauseNow')}
            </span>
          )}
        </Ring>
        <span className={styles.secondary}>
          {t('session.pause')} <span data-testid="pause-time">{formatClock(times.pauseMs)}</span> ·{' '}
          {t('session.session')}{' '}
          <span data-testid="session-time">{formatClock(times.sessionMs)}</span>
        </span>
        {/* Au plus une annonce par minute pour les temps (section 8). */}
        <p className="visually-hidden" aria-live="polite">
          {t('session.announce', { duration: formatDuration(times.knitMs, locale) })}
        </p>
      </section>

      <button type="button" className={styles.rowZone} onClick={incrementRow}>
        <KnitTexture className={styles.rowTexture} />
        <span className={styles.rowCount}>
          <span className={styles.rowLabel}>{t('session.row')}</span>
          <span className={styles.rowValue} data-testid="row-count">
            {project.rowCount}
          </span>
        </span>
        <span className="visually-hidden">
          {t('session.plusOne')} {t('session.rowZoneHint')}
        </span>
        <span className={styles.plusOne} aria-hidden="true">
          <Plus />
        </span>
      </button>

      <Card className={styles.stitches}>
        <span className={styles.stitchLabel} id="stitch-label">
          {t('session.stitches')}
        </span>
        <Stepper
          value={String(project.stitchCount)}
          labelledBy="stitch-label"
          decreaseLabel={t('project.decrementStitch')}
          increaseLabel={t('project.incrementStitch')}
          onDecrease={() => counter('decrementStitch')}
          onIncrease={() => counter('incrementStitch')}
        />
      </Card>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => counter('decrementRow')}>
          <ArrowCounterClockwise aria-hidden="true" />
          {t('session.undoRow')}
        </Button>
        <Button variant="dark" onClick={openPauseSheet}>
          <PauseIcon aria-hidden="true" />
          {t('session.pauseButton')}
        </Button>
      </div>

      {pauseSheet && (
        <PauseSheet
          initialMinutes={defaultPause?.value ?? DEFAULT_PAUSE_MINUTES}
          onLaunch={(m) => void launchPause(m)}
          onClose={() => setPauseSheet(false)}
        />
      )}

      {openPause && (
        <PauseScreen
          pause={openPause}
          now={now}
          knitMs={times.knitMs}
          rowCount={project.rowCount}
          onEnd={() => void safely(() => endPause(session.id, Date.now()))}
          onIncrementRow={incrementRow}
        />
      )}

      {confirmEnd && (
        <ConfirmDialog
          title={t('session.endTitle')}
          message={t('session.endMessage')}
          confirmLabel={t('session.endConfirm')}
          cancelLabel={t('app.cancel')}
          onConfirm={() => void finish()}
          onCancel={() => setConfirmEnd(false)}
        />
      )}
    </Page>
  );
}
