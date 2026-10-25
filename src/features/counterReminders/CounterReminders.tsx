import { Bell, Check, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { safely } from '../../app/toast';
import { useCounterReminders } from '../../db/hooks';
import {
  NAME_MAX,
  addCounterReminder,
  deleteCounterReminder,
  markCounterReminderDone,
} from '../../db/repo';
import { dueCounterReminders } from '../../domain/counterReminders';
import type { CounterReminder, Project } from '../../domain/types';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { Field } from '../../ui/Field';
import { Sheet } from '../../ui/Overlay';
import { pageStyles } from '../../ui/Page';
import styles from './CounterReminders.module.css';

const KINDS: CounterReminder['kind'][] = ['increase', 'decrease', 'cutYarn', 'custom'];

function useLabel() {
  const { t } = useTranslation();
  return (r: CounterReminder) =>
    r.label ? `${t(`counterReminders.${r.kind}`)} — ${r.label}` : t(`counterReminders.${r.kind}`);
}

/** Bandeaux des rappels de rangs atteints (E4 et E3), avec « Fait ». */
export function DueCounterReminders({ project }: { project: Project }) {
  const { t } = useTranslation();
  const label = useLabel();
  const reminders = useCounterReminders(project.id);
  const due = dueCounterReminders(reminders ?? [], project.rowCount);
  if (due.length === 0) return null;
  return (
    <div className={pageStyles.section} role="status">
      {due.map((r) => (
        <div key={r.id} className={styles.due}>
          <Bell className={styles.dueIcon} aria-hidden="true" />
          <p className={styles.itemText}>
            {t('counterReminders.due', { row: r.atRow, kind: label(r) })}
          </p>
          <Button
            variant="secondary"
            onClick={() => void safely(() => markCounterReminderDone(r.id, Date.now()))}
          >
            <Check aria-hidden="true" />
            {t('counterReminders.done')}
          </Button>
        </div>
      ))}
    </div>
  );
}

/** Gestion des rappels de rangs sur la fiche projet (Should have). */
export function CounterRemindersSection({ project }: { project: Project }) {
  const { t } = useTranslation();
  const label = useLabel();
  const reminders = useCounterReminders(project.id);
  const [adding, setAdding] = useState(false);
  if (!reminders) return null;

  return (
    <section className={pageStyles.section} aria-labelledby="counter-reminders-title">
      <h2 id="counter-reminders-title">{t('counterReminders.title')}</h2>
      {reminders.length === 0 ? (
        <p className={pageStyles.muted}>{t('counterReminders.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {reminders.map((r) => (
            <li key={r.id} className={styles.item}>
              <span className={cx(styles.itemText, r.doneAt && styles.done)}>
                {t('counterReminders.item', { row: r.atRow, kind: label(r) })}
              </span>
              <Button
                variant="ghost"
                aria-label={t('counterReminders.delete')}
                onClick={() => void safely(() => deleteCounterReminder(r.id))}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" block onClick={() => setAdding(true)}>
        <Plus aria-hidden="true" />
        {t('counterReminders.add')}
      </Button>
      {adding && (
        <AddReminderSheet
          projectId={project.id}
          defaultRow={project.rowCount + 1}
          onClose={() => setAdding(false)}
        />
      )}
    </section>
  );
}

function AddReminderSheet({
  projectId,
  defaultRow,
  onClose,
}: {
  projectId: string;
  defaultRow: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [atRow, setAtRow] = useState(String(defaultRow));
  const [kind, setKind] = useState<CounterReminder['kind']>('increase');
  const [text, setText] = useState('');
  const row = Number(atRow);
  const valid = atRow !== '' && Number.isInteger(row) && row >= 0;

  async function add() {
    if (!valid) return;
    onClose();
    await safely(() =>
      addCounterReminder({ projectId, atRow: row, kind, ...(text.trim() ? { label: text } : {}) }),
    );
  }

  return (
    <Sheet title={t('counterReminders.add')} onClose={onClose}>
      <div className={styles.form}>
        <Field label={t('counterReminders.atRow')}>
          {(props) => (
            <input
              {...props}
              type="number"
              inputMode="numeric"
              min={0}
              value={atRow}
              onChange={(e) => setAtRow(e.target.value)}
            />
          )}
        </Field>
        <Field label={t('counterReminders.kind')}>
          {(props) => (
            <select
              {...props}
              value={kind}
              onChange={(e) => setKind(e.target.value as CounterReminder['kind'])}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`counterReminders.${k}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t('counterReminders.label')}>
          {(props) => (
            <input
              {...props}
              maxLength={NAME_MAX}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
        </Field>
        <Button variant="primary" block disabled={!valid} onClick={() => void add()}>
          {t('counterReminders.add')}
        </Button>
      </div>
    </Sheet>
  );
}
