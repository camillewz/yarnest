import { Plus, Settings } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useNow } from '../../app/clock';
import { useActiveSession, useAllHistory, useProjects, useSetting } from '../../db/hooks';
import { formatClock, formatDuration } from '../../domain/format';
import { sessionTimes } from '../../domain/time';
import type { Locale, Project, ProjectStatus } from '../../domain/types';
import { dayLabel } from '../../i18n/dates';
import { Badge } from '../../ui/Badge';
import { buttonClass } from '../../ui/Button';
import { cardClass } from '../../ui/Card';
import { cx } from '../../ui/cx';
import { IconLink } from '../../ui/IconLink';
import { Page, pageStyles } from '../../ui/Page';
import { Pill, PillGroup } from '../../ui/Pill';
import { lastSessionOf } from './projectSummary';
import styles from './ProjectList.module.css';

const FILTERS = ['all', 'active', 'todo', 'paused', 'done'] as const;
type Filter = (typeof FILTERS)[number];

/** E1 — Mes projets. */
export function ProjectListPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const now = useNow();
  const projects = useProjects();
  const history = useAllHistory();
  const active = useActiveSession();
  const pending = useSetting('pendingReviewSessionId');
  const [filter, setFilter] = useState<Filter>('all');

  const byId = new Map((projects ?? []).map((p) => [p.id, p]));
  const activeSession = active?.value;
  const activeProject = activeSession && byId.get(activeSession.projectId);
  const pendingSession = history?.sessions.find((s) => s.id === pending?.value);
  const pendingProject = pendingSession && byId.get(pendingSession.projectId);
  const visible = (projects ?? []).filter((p) => filter === 'all' || p.status === filter);

  const newProjectLink = (label: string) => (
    <Link to="/projects/new" className={buttonClass('primary', true)}>
      <Plus aria-hidden="true" />
      {label}
    </Link>
  );

  if (projects?.length === 0) {
    return (
      <Page
        title={t('screens.projects.title')}
        actions={<IconLink to="/settings" label={t('app.settings')} icon={Settings} />}
      >
        <div className={pageStyles.center}>
          <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
            <circle cx="48" cy="48" r="40" fill="var(--primary-soft)" />
            <path
              d="M20 56c14-20 42-20 56 0"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          <h2>{t('projects.emptyTitle')}</h2>
          <p className={pageStyles.muted}>{t('projects.emptyText')}</p>
          {newProjectLink(t('projects.createFirst'))}
        </div>
      </Page>
    );
  }

  return (
    <Page
      title={t('screens.projects.title')}
      actions={<IconLink to="/settings" label={t('app.settings')} icon={Settings} />}
      bottom={newProjectLink(t('projects.new'))}
    >
      {pendingSession && pendingProject && (
        <Link to={`/sessions/${pendingSession.id}/review`} className={cx(cardClass, styles.review)}>
          <span className={styles.reviewTitle}>{t('projects.pendingReviewTitle')}</span>
          <span className={pageStyles.muted}>
            {t('projects.pendingReviewText', { name: pendingProject.name })}
          </span>
        </Link>
      )}

      {activeSession && activeProject && history && (
        <div className={cx(cardClass, styles.banner)}>
          <div className={styles.bannerText}>
            <p className={styles.bannerTitle}>
              <span className={styles.dot} aria-hidden="true" />
              {t('projects.activeBanner', { name: activeProject.name })}
            </p>
            <p className={styles.time}>
              {t('projects.activeKnit', {
                time: formatClock(sessionTimes(activeSession, history.pauses, now).knitMs),
              })}
            </p>
          </div>
          <Link to="/session" className={buttonClass('secondary')}>
            {t('projects.resume')}
          </Link>
        </div>
      )}

      <PillGroup label={t('projects.filterLabel')}>
        {FILTERS.map((f) => (
          <Pill key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? t('projects.all') : t(`status.${f}`)}
          </Pill>
        ))}
      </PillGroup>

      {visible.length === 0 && projects && (
        <p className={pageStyles.muted}>{t('projects.noneInFilter')}</p>
      )}
      <ul className={styles.list}>
        {visible.map((project) => (
          <li key={project.id}>
            <ProjectCard project={project} meta={cardMeta(project)} />
          </li>
        ))}
      </ul>
    </Page>
  );

  function cardMeta(project: Project): string {
    const row = t('projects.row', { count: project.rowCount });
    const last = history && lastSessionOf(project.id, history.sessions, history.pauses, now);
    if (!last) return `${row} · ${t('projects.noSession')}`;
    const day = dayLabel(last.session.startedAt, now, locale, {
      today: t('day.today'),
      yesterday: t('day.yesterday'),
    });
    return `${row} · ${t('projects.lastSession', { day, duration: formatDuration(last.knitMs, locale) })}`;
  }
}

function ProjectCard({ project, meta }: { project: Project; meta: string }) {
  const { t } = useTranslation();
  return (
    <Link to={`/projects/${project.id}`} className={cardClass}>
      <span className={styles.cardTop}>
        <span className={styles.name}>{project.name}</span>
        <StatusBadge status={project.status} label={t(`status.${project.status}`)} />
      </span>
      <span className={cx(styles.meta)}>{meta}</span>
    </Link>
  );
}

function StatusBadge({ status, label }: { status: ProjectStatus; label: string }) {
  return <Badge label={label} {...(status === 'active' ? { tone: 'active' as const } : {})} />;
}
