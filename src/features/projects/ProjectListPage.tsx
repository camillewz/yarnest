import { CaretRight, Notebook, Plus, SlidersHorizontal, Yarn } from '@phosphor-icons/react';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useNow } from '../../app/clock';
import { useActiveSession, useAllHistory, useProjects, useSetting } from '../../db/hooks';
import { greetingPeriod } from '../../domain/display';
import { formatClock, formatDuration } from '../../domain/format';
import { knitByDay } from '../../domain/journal';
import { pauseRing } from '../../domain/reminders';
import { sessionTimes } from '../../domain/time';
import type { Locale, Pause, Project, ProjectStatus, Session } from '../../domain/types';
import { dayLabel, lastDays, longDate } from '../../i18n/dates';
import { Badge, statusTone } from '../../ui/Badge';
import { buttonClass } from '../../ui/Button';
import { cardClass } from '../../ui/Card';
import { cx } from '../../ui/cx';
import { IconLink } from '../../ui/IconLink';
import { KnitTexture, Stitch, Swatch } from '../../ui/Knit';
import { Page, pageStyles } from '../../ui/Page';
import { Ring } from '../../ui/Ring';
import { Tabs } from '../../ui/Tabs';
import { lastSessionOf } from './projectSummary';
import styles from './ProjectList.module.css';

type Filter = 'all' | 'active' | 'todo' | 'done';

/** « En cours » regroupe les projets en cours et en pause (badge « En pause »). */
const inFilter = (status: ProjectStatus, filter: Filter) =>
  filter === 'all' || status === filter || (filter === 'active' && status === 'paused');

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
  const visible = (projects ?? []).filter((p) => inFilter(p.status, filter));
  const count = (f: Filter) => (projects ?? []).filter((p) => inFilter(p.status, f)).length;
  const tab = (f: Filter, label: string) => ({
    value: f,
    label: f !== 'all' && count(f) > 0 ? t('projects.tab', { label, count: count(f) }) : label,
  });

  const header = (
    <header className={styles.header}>
      <div className={styles.greeting}>
        <span className={styles.date}>{longDate(now, locale)}</span>
        <p className={styles.hello}>{t(`home.${greetingPeriod(new Date(now).getHours())}`)}</p>
        <span>{t('home.prompt')}</span>
      </div>
      <IconLink to="/settings" label={t('app.settings')} icon={SlidersHorizontal} />
    </header>
  );

  if (projects?.length === 0) {
    return (
      <Page title={t('screens.projects.title')} titleHidden nav>
        {header}
        <div className={styles.empty}>
          <span className={styles.blob} aria-hidden="true">
            <Yarn className={styles.blobIcon} weight="thin" />
          </span>
          <h2>{t('projects.emptyTitle')}</h2>
          <p className={styles.emptyText}>{t('projects.emptyText')}</p>
          <Link to="/projects/new" className={buttonClass('primary')}>
            <Plus aria-hidden="true" />
            {t('projects.createFirst')}
          </Link>
        </div>
      </Page>
    );
  }

  return (
    <Page title={t('screens.projects.title')} titleHidden nav>
      {header}

      {pendingSession && pendingProject && (
        <Link to={`/sessions/${pendingSession.id}/review`} className={cx(cardClass, styles.review)}>
          <span className={styles.reviewIcon} aria-hidden="true">
            <Notebook />
          </span>
          <span className={styles.reviewText}>
            <span className={styles.reviewTitle}>{t('projects.pendingReviewTitle')}</span>
            <span className={pageStyles.muted}>
              {t('projects.pendingReviewText', { name: pendingProject.name })}
            </span>
          </span>
        </Link>
      )}

      {history && <Week sessions={history.sessions} pauses={history.pauses} now={now} />}

      {activeSession && activeProject && history && (
        <ActiveCard
          session={activeSession}
          project={activeProject}
          pauses={history.pauses}
          now={now}
        />
      )}

      <div className={styles.listBlock}>
        <Tabs
          label={t('projects.filterLabel')}
          value={filter}
          onChange={setFilter}
          options={[
            tab('all', t('projects.all')),
            tab('active', t('status.active')),
            tab('todo', t('status.todo')),
            tab('done', t('projects.tabDone')),
          ]}
        />

        {visible.length === 0 && projects && (
          <p className={pageStyles.muted}>{t('projects.noneInFilter')}</p>
        )}
        <ul className={styles.list} aria-label={t('screens.projects.title')}>
          {visible.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} meta={cardMeta(project)} />
            </li>
          ))}
        </ul>
      </div>
    </Page>
  );

  function cardMeta(project: Project): string[] {
    const parts = project.technique ? [t(`technique.${project.technique}`)] : [];
    parts.push(t('projects.row', { count: project.rowCount }));
    const last = history && lastSessionOf(project.id, history.sessions, history.pauses, now);
    if (!last) return [...parts, t('projects.noSession')];
    const day = dayLabel(last.session.startedAt, now, locale, {
      today: t('day.today'),
      yesterday: t('day.yesterday'),
    });
    return [
      ...parts,
      t('projects.lastSession', { day, duration: formatDuration(last.knitMs, locale) }),
    ];
  }
}

/** Les 7 derniers jours : un point de maille les jours tricotés. */
function Week({ sessions, pauses, now }: { sessions: Session[]; pauses: Pause[]; now: number }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const days = lastDays(now, 7, locale);
  const knit = knitByDay(sessions, pauses, days, now);
  const total = knit.reduce((sum, ms) => sum + ms, 0);
  return (
    <section className={styles.week} aria-labelledby="week-title">
      <div className={styles.weekHeader}>
        <h2 id="week-title" className={styles.weekTitle}>
          {t('home.week')}
        </h2>
        <span className={styles.weekTotal}>
          {t('home.weekTotal', { duration: formatDuration(total, locale) })}
        </span>
      </div>
      <ol className={styles.days}>
        {days.map((d, i) => {
          const ms = knit[i] ?? 0;
          const today = i === days.length - 1;
          return (
            <li key={d.start} className={styles.day}>
              <span className="visually-hidden">
                {ms > 0
                  ? t('home.weekDay', { day: d.label, duration: formatDuration(ms, locale) })
                  : t('home.weekNone', { day: d.label })}
              </span>
              <span className={styles.dayInitial} aria-hidden="true">
                {d.initial}
              </span>
              <span className={cx(styles.dayNumber, today && styles.today)} aria-hidden="true">
                {d.day}
              </span>
              <Stitch className={cx(styles.dayMark, ms > 0 && styles.knitted)} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

interface ActiveCardProps {
  session: Session;
  project: Project;
  pauses: Pause[];
  now: number;
}

/** Session en cours : reprise en un tap depuis l'accueil. */
function ActiveCard({ session, project, pauses, now }: ActiveCardProps) {
  const { t } = useTranslation();
  const reminders = useSetting('remindersEnabled');
  const own = pauses.filter((p) => p.sessionId === session.id);
  const ring = pauseRing({
    session,
    pauses: own,
    now,
    remindersEnabled: reminders?.value !== false,
  });
  return (
    <section className={styles.active} aria-labelledby="active-title">
      <KnitTexture className={styles.activeTexture} />
      <Ring progress={ring?.progress ?? 0} tone="dark" className={styles.activeRing} />
      <div className={styles.activeText}>
        <span className={styles.activeLabel}>
          <span className={styles.dot} aria-hidden="true" />
          {t('status.active')}
        </span>
        <h2 id="active-title" className={styles.activeName}>
          {project.name}
        </h2>
        <span className={styles.activeMeta}>
          {t('home.activeMeta', {
            time: formatClock(sessionTimes(session, own, now).knitMs),
            row: project.rowCount,
          })}
        </span>
      </div>
      <Link to="/session" className={styles.resume}>
        {t('projects.resume')}
      </Link>
    </section>
  );
}

function ProjectCard({ project, meta }: { project: Project; meta: string[] }) {
  const { t } = useTranslation();
  return (
    <Link to={`/projects/${project.id}`} className={cx(cardClass, styles.card)}>
      <Swatch projectId={project.id} />
      <span className={styles.cardBody}>
        <span className={styles.name}>{project.name}</span>
        <span className={styles.meta}>
          {/* Chaque morceau reste sur une ligne : « 1 h 14 » ne se coupe pas. */}
          {meta.map((part, i) => (
            <Fragment key={i}>
              {i > 0 && ' · '}
              <span className={styles.metaPart}>{part}</span>
            </Fragment>
          ))}
        </span>
        <Badge label={t(`status.${project.status}`)} tone={statusTone(project.status)} />
      </span>
      <CaretRight className={styles.chevron} aria-hidden="true" />
    </Link>
  );
}
