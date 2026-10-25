import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { safely } from '../../app/toast';
import { useProject } from '../../db/hooks';
import { NAME_MAX, NOTE_MAX, createProject, deleteProject, updateProject } from '../../db/repo';
import { db } from '../../db/schema';
import type { ProjectStatus, Technique } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { ConfirmDialog } from '../../ui/Overlay';
import { Page, PageMessage } from '../../ui/Page';
import { Pill, PillGroup } from '../../ui/Pill';
import styles from './ProjectForm.module.css';

const TECHNIQUES: Technique[] = ['knit', 'crochet'];
export const STATUSES: ProjectStatus[] = ['todo', 'active', 'paused', 'done'];

/** E2 — Nouveau projet (sans `:id`) ou modification (avec `:id`). */
export function ProjectFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const project = useProject(id);

  if (!id) return <ProjectForm />;
  if (!project) return <PageMessage title={t('screens.projectEdit.title')} />;
  if (!project.value) {
    return (
      <PageMessage title={t('screens.projectEdit.title')} message={t('errors.projectNotFound')} />
    );
  }
  return <ProjectForm key={project.value.id} initial={project.value} />;
}

interface ProjectFormProps {
  initial?: {
    id: string;
    name: string;
    technique?: Technique;
    note?: string;
    status: ProjectStatus;
  };
}

function ProjectForm({ initial }: ProjectFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState(initial?.name ?? '');
  const [technique, setTechnique] = useState<Technique | undefined>(initial?.technique);
  const [note, setNote] = useState(initial?.note ?? '');
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? 'todo');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const editing = initial !== undefined;

  useEffect(() => {
    if (initial)
      void db.sessions.where('projectId').equals(initial.id).count().then(setSessionCount);
  }, [initial, confirmDelete]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const input = { name, note, ...(technique ? { technique } : {}) };
    if (initial) {
      const ok = await safely(async () => {
        await updateProject(initial.id, { ...input, status }, Date.now());
        return true;
      });
      if (ok) navigate(`/projects/${initial.id}`, { replace: true });
    } else {
      const newId = await safely(() => createProject(input, Date.now()));
      if (newId) navigate(`/projects/${newId}`, { replace: true });
    }
  }

  async function remove() {
    if (!initial) return;
    setConfirmDelete(false);
    await safely(() => deleteProject(initial.id));
    navigate('/', { replace: true });
  }

  return (
    <Page
      title={editing ? t('screens.projectEdit.title') : t('screens.projectNew.title')}
      backTo={editing ? `/projects/${initial.id}` : '/'}
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <Field label={`${t('form.name')} *`} hint={t('form.nameHint')}>
          {(props) => (
            <input
              {...props}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              required
              autoComplete="off"
              enterKeyHint="done"
            />
          )}
        </Field>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t('form.technique')}</legend>
          <PillGroup label={t('form.technique')}>
            {TECHNIQUES.map((tech) => (
              <Pill
                key={tech}
                selected={technique === tech}
                onClick={() => setTechnique(technique === tech ? undefined : tech)}
              >
                {t(`technique.${tech}`)}
              </Pill>
            ))}
          </PillGroup>
        </fieldset>

        <Field label={t('form.note')} hint={t('form.noteHint')}>
          {(props) => (
            <textarea
              {...props}
              rows={3}
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>

        {editing && (
          <Field label={t('status.label')}>
            {(props) => (
              <select
                {...props}
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        <div className={styles.actions}>
          <Button type="submit" variant="primary" block large disabled={!name.trim()}>
            {editing ? t('form.save') : t('form.create')}
          </Button>
          {editing && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              {t('form.delete')}
            </Button>
          )}
        </div>
      </form>

      {confirmDelete && initial && (
        <ConfirmDialog
          title={t('form.deleteTitle', { name: initial.name })}
          message={t('form.deleteMessage', { count: sessionCount })}
          confirmLabel={t('form.deleteConfirm')}
          cancelLabel={t('app.cancel')}
          danger
          onConfirm={() => void remove()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </Page>
  );
}
