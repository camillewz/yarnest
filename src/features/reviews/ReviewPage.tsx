import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router';
import { safely } from '../../app/toast';
import { usePauses, useProject, useReview, useSession } from '../../db/hooks';
import { NOTE_MAX, saveReview, skipReview } from '../../db/repo';
import { rowsDone } from '../../domain/counters';
import { formatDuration } from '../../domain/format';
import { BODY_ZONES, toggleZone, zonesToStore, type ZoneSelection } from '../../domain/review';
import { sessionTimes, toInstant } from '../../domain/time';
import type { Locale, Pause, Project, Review, Session } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Field } from '../../ui/Field';
import { Page, PageMessage } from '../../ui/Page';
import { Pill, PillGroup } from '../../ui/Pill';
import styles from './Review.module.css';

const MOODS = [1, 2, 3, 4, 5] as const;

/** E6 — Bilan de session (US5.1). Sert aussi à modifier un bilan depuis le journal. */
export function ReviewPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const session = useSession(id);
  const project = useProject(session?.value?.projectId);
  const pauses = usePauses(session?.value?.id);
  const review = useReview(id);
  const title = t('screens.review.title');

  if (!session || !review || (session.value && (!project || !pauses))) {
    return <PageMessage title={title} />;
  }
  if (!session.value || !project?.value || !pauses) {
    return <PageMessage title={title} message={t('errors.sessionNotFound')} />;
  }
  if (!session.value.endedAt) return <Navigate to="/session" replace />;
  return (
    <ReviewForm
      key={session.value.id}
      session={session.value}
      project={project.value}
      pauses={pauses}
      {...(review.value ? { review: review.value } : {})}
    />
  );
}

interface ReviewFormProps {
  session: Session;
  project: Project;
  pauses: Pause[];
  review?: Review;
}

function ReviewForm({ session, project, pauses, review }: ReviewFormProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const navigate = useNavigate();
  const [mood, setMood] = useState<Review['mood']>(review?.mood);
  // `zones: []` en base ne distingue pas « Aucune » de « rien coché » (section 4) : on rouvre vide.
  const [zones, setZones] = useState<ZoneSelection>(review?.zones ?? []);
  const [note, setNote] = useState(review?.note ?? '');

  const times = sessionTimes(session, pauses, toInstant(session.endedAt ?? session.startedAt));
  const rows = rowsDone(session.rowsAtStart, session.rowsAtEnd ?? project.rowCount);
  const backToProject = () => navigate(`/projects/${project.id}`, { replace: true });

  async function save() {
    const ok = await safely(async () => {
      await saveReview(
        session.id,
        { zones: zonesToStore(zones), note, ...(mood ? { mood } : {}) },
        Date.now(),
      );
      return true;
    });
    if (ok) backToProject();
  }

  async function skip() {
    await safely(() => skipReview(session.id));
    backToProject();
  }

  return (
    <Page
      title={t('review.title', { name: project.name })}
      bottom={
        <>
          <Button variant="primary" block large onClick={() => void save()}>
            {t('review.save')}
          </Button>
          <Button variant="ghost" block onClick={() => void skip()}>
            {t('review.skip')}
          </Button>
        </>
      }
    >
      <Card className={styles.summary}>
        {session.endReason === 'auto12h' && <p className={styles.note}>{t('review.autoClosed')}</p>}
        <p>
          {t('review.knit', { duration: formatDuration(times.knitMs, locale) })} ·{' '}
          {t('review.pause', {
            duration: formatDuration(times.pauseMs, locale),
            count: pauses.length,
          })}
        </p>
        <p>
          {t('review.session', { duration: formatDuration(times.sessionMs, locale) })} ·{' '}
          {t('journal.rowsDone', { count: rows })}
        </p>
      </Card>

      <div className={styles.form}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t('review.mood')}</legend>
          <div role="radiogroup" aria-label={t('review.mood')} className={styles.moods}>
            {MOODS.map((value) => (
              <Pill
                key={value}
                role="radio"
                aria-pressed={undefined}
                aria-checked={mood === value}
                aria-label={t('review.moodValue', { value })}
                selected={mood === value}
                className={styles.mood}
                onClick={() => setMood(mood === value ? undefined : value)}
              >
                {value}
              </Pill>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t('review.zones')}</legend>
          <PillGroup label={t('review.zones')}>
            {BODY_ZONES.map((zone) => (
              <Pill
                key={zone}
                selected={zones !== 'none' && zones.includes(zone)}
                onClick={() => setZones((z) => toggleZone(z, zone))}
              >
                {t(`review.${zone}`)}
              </Pill>
            ))}
            <Pill
              selected={zones === 'none'}
              onClick={() => setZones((z) => toggleZone(z, 'none'))}
            >
              {t('review.none')}
            </Pill>
          </PillGroup>
        </fieldset>

        <Field label={t('review.note')}>
          {(props) => (
            <textarea
              {...props}
              rows={3}
              maxLength={NOTE_MAX}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
      </div>
    </Page>
  );
}
