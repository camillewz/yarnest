import { Pencil, Play } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { safely } from '../../app/toast';
import { useActiveSession, useProject } from '../../db/hooks';
import { endSession, setProjectStatus, startSession } from '../../db/repo';
import { db } from '../../db/schema';
import type { Project, ProjectStatus, Session } from '../../domain/types';
import { Button } from '../../ui/Button';
import { fieldStyles } from '../../ui/Field';
import { IconLink } from '../../ui/IconLink';
import { ConfirmDialog } from '../../ui/Overlay';
import { Page, PageMessage, pageStyles } from '../../ui/Page';
import { cx } from '../../ui/cx';
import { CounterControls } from './CounterControl';
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
      <div className={styles.meta}>
        <label className={pageStyles.muted} htmlFor="project-status">
          {t('status.label')}
        </label>
        <select
          id="project-status"
          className={cx(fieldStyles.input, styles.statusSelect)}
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
        {project.technique && (
          <span className={styles.technique}>{t(`technique.${project.technique}`)}</span>
        )}
      </div>

      {project.note && <p className={styles.note}>{t('project.note', { note: project.note })}</p>}

      <CounterControls project={project} />

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
