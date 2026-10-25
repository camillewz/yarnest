import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setSetting } from '../db/repo';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { FullScreen } from '../ui/Overlay';
import { safely } from './toast';
import styles from './Onboarding.module.css';

const STEPS = [1, 2, 3] as const;

/** Formes abstraites, une par étape (pas d'illustration de pelote). */
function Shape({ step }: { step: number }) {
  return (
    <svg className={styles.shape} viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r="44" fill="var(--primary-soft)" />
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
        {step === 1 && (
          <>
            <path d="M26 38c12-12 32-12 44 0" />
            <path d="M26 52c12-12 32-12 44 0" />
            <path d="M26 66c12-12 32-12 44 0" />
          </>
        )}
        {step === 2 && (
          <>
            <circle cx="48" cy="50" r="22" />
            <path d="M48 36v14l9 6" />
          </>
        )}
        {step === 3 && <path d="M30 50l12 12 24-26" />}
      </g>
    </svg>
  );
}

/** Onboarding de 3 écrans au premier lancement (Should have). */
export function Onboarding() {
  const { t } = useTranslation();
  const [step, setStep] = useState<(typeof STEPS)[number]>(1);
  const done = () => void safely(() => setSetting('onboardingDone', true));
  const last = step === STEPS.length;

  return (
    <FullScreen label={t('onboarding.label')}>
      <Shape step={step} />
      <h2 className={styles.title}>{t(`onboarding.s${step}Title`)}</h2>
      <p className={styles.text}>{t(`onboarding.s${step}Text`)}</p>
      <div
        className={styles.dots}
        role="img"
        aria-label={t('onboarding.step', { current: step, total: STEPS.length })}
      >
        {STEPS.map((s) => (
          <span key={s} className={cx(styles.dot, s === step && styles.current)} />
        ))}
      </div>
      <div className={styles.actions}>
        <Button
          variant="primary"
          block
          large
          onClick={() => (last ? done() : setStep((s) => (s + 1) as typeof step))}
        >
          {last ? t('onboarding.start') : t('onboarding.next')}
        </Button>
        {!last && (
          <Button variant="ghost" block onClick={done}>
            {t('onboarding.skip')}
          </Button>
        )}
      </div>
    </FullScreen>
  );
}
