import { ChevronDown, Pencil, Play } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { safely } from '../../app/toast';
import { useActiveSession, useProject, useProjectHistory } from '../../db/hooks';
import { endSession, setProjectStatus, startSession } from '../../db/repo';
import { db } from '../../db/schema';
import { formatDuration } from '../../domain/format';
import { journal } from '../../domain/journal';
import type { Locale, Project, ProjectStatus, Session } from '../../domain/types';
import { statusTone } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { IconLink } from '../../ui/IconLink';
import { Swatch, yarnColor } from '../../ui/Knit';
import { ConfirmDialog } from '../../ui/Overlay';
import { Page, PageMessage, pageStyles } from '../../ui/Page';
import { CounterRemindersSection, DueCounterReminders } from '../counterReminders/CounterReminders';
import { CounterControls } from './CounterControl';
import { Journal } from './Journal';
import { STATUSES } from './ProjectFormPage';
import styles from './ProjectDetail.module.css';

/** E3 — Fiche projet. */
export function ProjectDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const project = useProject(id);
  if (!project) return <PageMessage title={t('screens.project.title')} />;
  if (!project.value) {
    return <PageMessage title={t('screens.project.title')} message={t('errors.projectNotFound')} />;
  }
  return <ProjectDetail project={project.value} />;
}

function ProjectDetail({ project }: { project: Project }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const active = useActiveSession();
  const [conflict, setConflict] = useState<{ session: Session; name: string } | null>(null);
  const activeHere = active?.value?.projectId === project.id;

  async function start() {
    const result = await safely(() => startSession(project.id, Date.now()));
    if (!result) return;
    if (result.kind === 'conflict') {
      const other = await db.projects.get(result.session.projectId);
      setConflict({ session: result.session, name: other?.name ?? '' });
      return;
    }
    navigate('/session');
  }

  async function endOtherAndStart(session: Session) {
    setConflict(null);
    const ended = await safely(async () => {
      await endSession(session.id, Date.now());
      return true;
    });
    if (ended) await start();
  }

  return (
    <Page
      title={project.name}
      backTo="/"
      halo={yarnColor(project.id)}
      hero
      eyebrow={
        <div className={styles.chips}>
          {project.technique && (
            <span className={styles.technique}>{t(`technique.${project.technique}`)}</span>
          )}
          <StatusSelect project={project} />
        </div>
      }
      actions={
        <IconLink to={`/projects/${project.id}/edit`} label={t('project.edit')} icon={Pencil} />
      }
      bottom={
        <Button variant="primary" block large onClick={() => void start()}>
          <Play aria-hidden="true" />
          {activeHere ? t('project.resumeSession') : t('project.start')}
        </Button>
      }
    >
      <Stats project={project} />

      <DueCounterReminders project={project} />

      <section className={pageStyles.section} aria-labelledby="progress-title">
        <h2 id="progress-title">{t('project.progress')}</h2>
        <CounterControls project={project} />
      </section>

      {project.note && (
        <section className={styles.wool} aria-labelledby="wool-title">
          <Swatch projectId={project.id} />
          <div className={styles.woolText}>
            <h2 id="wool-title" className="eyebrow">
              {t('project.wool')}
            </h2>
            <p className={styles.note}>{project.note}</p>
          </div>
        </section>
      )}

      <CounterRemindersSection project={project} />

      <Journal projectId={project.id} />

      {conflict && (
        <ConfirmDialog
          title={t('project.conflictTitle', { name: conflict.name })}
          message={t('project.conflictMessage')}
          confirmLabel={t('project.conflictConfirm')}
          cancelLabel={t('app.cancel')}
          onConfirm={() => void endOtherAndStart(conflict.session)}
          onCancel={() => setConflict(null)}
        />
      )}
    </Page>
  );
}

/** Statut en puce, modifiable sans bouton (CA1.4). */
function StatusSelect({ project }: { project: Project }) {
  const { t } = useTranslation();
  const tone = statusTone(project.status);
  return (
    <span className={cx(styles.status, tone && styles[tone])}>
      <label className="visually-hidden" htmlFor="project-status">
        {t('status.label')}
      </label>
      <select
        id="project-status"
        className={styles.statusSelect}
        value={project.status}
        onChange={(e) =>
          void safely(() =>
            setProjectStatus(project.id, e.target.value as ProjectStatus, Date.now()),
          )
        }
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`status.${s}`)}
          </option>
        ))}
      </select>
      <ChevronDown className={styles.statusIcon} aria-hidden="true" />
    </span>
  );
}

/** Trois tuiles : rangs, temps tricoté, sessions terminées. */
function Stats({ project }: { project: Project }) {
  const { t, i18n } = useTranslation();
  const history = useProjectHistory(project.id);
  const { entries, totalKnitMs } = history
    ? journal(history.sessions, history.pauses, history.reviews)
    : { entries: [], totalKnitMs: 0 };
  const tiles = [
    { value: String(project.rowCount), label: t('project.statRows', { count: project.rowCount }) },
    { value: formatDuration(totalKnitMs, i18n.language as Locale), label: t('project.statKnit') },
    {
      value: String(entries.length),
      label: t('project.statSessions', { count: entries.length }),
    },
  ];
  return (
    <dl className={styles.stats} aria-label={t('project.stats')}>
      {tiles.map((tile) => (
        <div key={tile.label} className={styles.stat}>
          <dt className={styles.statLabel}>{tile.label}</dt>
          <dd className={styles.statValue}>{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
}
