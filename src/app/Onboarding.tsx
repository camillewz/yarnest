import { ArrowRight, Coffee, Notebook, Yarn } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setSetting } from '../db/repo';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { Stitch } from '../ui/Knit';
import { Wordmark } from '../ui/Logo';
import { FullScreen } from '../ui/Overlay';
import { safely } from './toast';
import styles from './Onboarding.module.css';

const STEPS = [1, 2, 3] as const;
type Step = (typeof STEPS)[number];

/** Halo, puce et forme abstraite de chaque étape (pas d'illustration de pelote). */
const LOOK: Record<Step, { halo: string; tone: 'terracotta' | 'sage' }> = {
  1: { halo: 'var(--apricot)', tone: 'terracotta' },
  2: { halo: 'var(--sage-light)', tone: 'sage' },
  3: { halo: 'var(--peach)', tone: 'terracotta' },
};

function Shape({ step }: { step: Step }) {
  if (step === 1) return <Yarn className={styles.icon} weight="light" aria-hidden="true" />;
  if (step === 2) return <Coffee className={styles.icon} weight="light" aria-hidden="true" />;
  return <Notebook className={styles.icon} weight="light" aria-hidden="true" />;
}

/** Onboarding de 3 écrans au premier lancement (Should have). */
export function Onboarding() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(1);
  const done = () => void safely(() => setSetting('onboardingDone', true));
  const last = step === STEPS.length;
  const look = LOOK[step];

  return (
    <FullScreen label={t('onboarding.label')} halo={look.halo} className={styles.screen}>
      <div className={styles.top}>
        <Wordmark label={t('app.name')} className={styles.logo} />
        {!last && (
          <Button variant="glass" onClick={done}>
            {t('onboarding.skip')}
          </Button>
        )}
      </div>

      <div className={styles.hero}>
        <span className={cx(styles.blob, styles[look.tone])} aria-hidden="true">
          <Shape step={step} />
        </span>
      </div>

      <div className={styles.text}>
        <span className={cx(styles.chip, styles[look.tone])}>
          {t('onboarding.chip', {
            current: step,
            total: STEPS.length,
            name: t(`onboarding.s${step}Chip`),
          })}
        </span>
        <h2 className={styles.title}>{t(`onboarding.s${step}Title`)}</h2>
        <p className={styles.body}>{t(`onboarding.s${step}Text`)}</p>
      </div>

      <div className={styles.bottom}>
        <div
          className={styles.dots}
          role="img"
          aria-label={t('onboarding.step', { current: step, total: STEPS.length })}
        >
          {STEPS.map((s) => (
            <span key={s} className={cx(styles.dot, s === step && styles.current)}>
              <Stitch />
              {s === step && (
                <>
                  <Stitch />
                  <Stitch />
                </>
              )}
            </span>
          ))}
        </div>
        <Button variant="primary" onClick={() => (last ? done() : setStep((s) => (s + 1) as Step))}>
          {last ? t('onboarding.start') : t('onboarding.next')}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </FullScreen>
  );
}
