import { Minus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { safely } from '../../app/toast';
import { applyCounter } from '../../db/repo';
import type { Project } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/Overlay';
import styles from './CounterControl.module.css';

type Kind = 'Row' | 'Stitch';

/** Compteurs de rangs et de mailles de la fiche projet, utilisables hors session (US4.2). */
export function CounterControls({ project }: { project: Project }) {
  return (
    <div className={styles.counters}>
      <CounterControl project={project} kind="Row" />
      <CounterControl project={project} kind="Stitch" />
    </div>
  );
}

function CounterControl({ project, kind }: { project: Project; kind: Kind }) {
  const { t } = useTranslation();
  const [confirmReset, setConfirmReset] = useState(false);
  const value = kind === 'Row' ? project.rowCount : project.stitchCount;
  const plural = kind === 'Row' ? 'Rows' : 'Stitches';
  const run = (action: Parameters<typeof applyCounter>[1]) =>
    void safely(() => applyCounter(project.id, action, Date.now()));

  return (
    <Card className={styles.counter}>
      <span className={styles.label} id={`${kind}-label`}>
        {kind === 'Row' ? t('project.rows') : t('project.stitches')}
      </span>
      <output className={styles.value} aria-labelledby={`${kind}-label`} aria-live="polite">
        {value}
      </output>
      <div className={styles.buttons}>
        <Button
          className={styles.round}
          aria-label={t(`project.decrement${kind}`)}
          onClick={() => run(`decrement${kind}`)}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          className={styles.round}
          aria-label={t(`project.increment${kind}`)}
          onClick={() => run(`increment${kind}`)}
        >
          +1
        </Button>
      </div>
      <Button
        variant="ghost"
        className={styles.reset}
        aria-label={t(`project.reset${plural}`)}
        onClick={() => setConfirmReset(true)}
      >
        {t('project.reset')}
      </Button>
      {confirmReset && (
        <ConfirmDialog
          title={t(`project.reset${plural}Title`)}
          confirmLabel={t('project.resetConfirm')}
          cancelLabel={t('app.cancel')}
          onConfirm={() => {
            setConfirmReset(false);
            run(`reset${plural}`);
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </Card>
  );
}
