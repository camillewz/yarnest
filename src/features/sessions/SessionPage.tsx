import { Minus, Pause as PauseIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';
import { useNow } from '../../app/clock';
import { safely } from '../../app/toast';
import { useActiveSession, usePauses, useProject, useSetting } from '../../db/hooks';
import { applyCounter, endPause, endSession, startPause } from '../../db/repo';
import { formatClock, formatDuration } from '../../domain/format';
import { DEFAULT_PAUSE_MINUTES, findOpenPause } from '../../domain/pauses';
import { sessionTimes } from '../../domain/time';
import type { Locale, Pause, Project, Session } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/Overlay';
import { Page, PageMessage, pageStyles } from '../../ui/Page';
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
  const [pauseSheet, setPauseSheet] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  useWakeLock(true);

  const times = sessionTimes(session, pauses, now);
  const openPause = findOpenPause(pauses, session.id);
  const knitShare = times.sessionMs > 0 ? (times.knitMs / times.sessionMs) * 100 : 100;

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
      actions={
        <Button variant="secondary" onClick={() => setConfirmEnd(true)}>
          {t('session.end')}
        </Button>
      }
    >
      <section className={styles.times} aria-label={t('screens.session.title')}>
        <span className={styles.knitLabel}>{t('session.knit')}</span>
        <span className="counter" data-testid="knit-time">
          {formatClock(times.knitMs)}
        </span>
        <span className={styles.secondary}>
          {t('session.pause')} <span data-testid="pause-time">{formatClock(times.pauseMs)}</span> ·{' '}
          {t('session.session')}{' '}
          <span data-testid="session-time">{formatClock(times.sessionMs)}</span>
        </span>
        <div
          className={styles.bar}
          role="meter"
          aria-label={t('session.progress')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(knitShare)}
        >
          <div className={styles.barKnit} style={{ width: `${knitShare}%` }} />
        </div>
        {/* Au plus une annonce par minute pour les temps (section 8). */}
        <p className={styles.liveRegion} aria-live="polite">
          {t('session.announce', { duration: formatDuration(times.knitMs, locale) })}
        </p>
      </section>

      <SessionExtras session={session} project={project} now={now} onPause={openPauseSheet} />

      <Card className={styles.stitches}>
        <span className={styles.stitchLabel} id="stitch-label">
          {t('session.stitches')}
        </span>
        <output className={styles.stitchValue} aria-labelledby="stitch-label" aria-live="polite">
          {project.stitchCount}
        </output>
        <Button
          className={styles.round}
          aria-label={t('project.decrementStitch')}
          onClick={() => counter('decrementStitch')}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          className={styles.round}
          aria-label={t('project.incrementStitch')}
          onClick={() => counter('incrementStitch')}
        >
          +1
        </Button>
      </Card>

      <button
        type="button"
        className={styles.rowZone}
        aria-label={t('session.rowZone', { count: project.rowCount })}
        onClick={incrementRow}
      >
        <span className={styles.rowLabel}>{t('session.row')}</span>
        <span className="counter" data-testid="row-count">
          {project.rowCount}
        </span>
        <span className={styles.plusOne} aria-hidden="true">
          {t('session.plusOne')}
        </span>
      </button>

      <Button
        variant="ghost"
        className={styles.correct}
        aria-label={t('project.decrementRow')}
        onClick={() => counter('decrementRow')}
      >
        <Minus aria-hidden="true" /> {t('session.correct')}
      </Button>

      <div className={pageStyles.bottom}>
        <Button variant="secondary" block large onClick={openPauseSheet}>
          <PauseIcon aria-hidden="true" />
          {t('session.startPause')}
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
