import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { safely } from '../../app/toast';
import { applyCounter } from '../../db/repo';
import type { Project } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmDialog } from '../../ui/Overlay';
import { Stepper } from '../../ui/Stepper';
import styles from './CounterControl.module.css';

type Kind = 'Row' | 'Stitch';

/** Compteurs de rangs et de mailles de la fiche projet, utilisables hors session (US4.2). */
export function CounterControls({ project }: { project: Project }) {
  return (
    <Card className={styles.counters}>
      <CounterControl project={project} kind="Row" />
      <CounterControl project={project} kind="Stitch" />
    </Card>
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
    <div className={styles.counter}>
      <div className={styles.labels}>
        <span className={styles.label} id={`${kind}-label`}>
          {kind === 'Row' ? t('project.rows') : t('project.stitches')}
        </span>
        <Button variant="ghost" className={styles.reset} onClick={() => setConfirmReset(true)}>
          {t(`project.reset${plural}`)}
        </Button>
      </div>
      <Stepper
        value={String(value)}
        labelledBy={`${kind}-label`}
        decreaseLabel={t(`project.decrement${kind}`)}
        increaseLabel={t(`project.increment${kind}`)}
        onDecrease={() => run(`decrement${kind}`)}
        onIncrease={() => run(`increment${kind}`)}
      />
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
    </div>
  );
}
