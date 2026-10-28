import { Minus, Plus } from '@phosphor-icons/react';
import { cx } from './cx';
import styles from './Stepper.module.css';

interface StepperProps {
  value: string;
  decreaseLabel: string;
  increaseLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease?: boolean;
  canIncrease?: boolean;
  /** Libellé visible associé à la valeur (compteurs). */
  labelledBy?: string;
  testId?: string;
  className?: string;
}

/** − valeur + en boutons ronds : compteurs de rangs et de mailles, durée de pause. */
export function Stepper({
  canDecrease = true,
  canIncrease = true,
  labelledBy,
  testId,
  className,
  ...props
}: StepperProps) {
  return (
    <div className={cx(styles.stepper, className)}>
      <button
        type="button"
        className={cx(styles.round, styles.minus)}
        aria-label={props.decreaseLabel}
        disabled={!canDecrease}
        onClick={props.onDecrease}
      >
        <Minus aria-hidden="true" />
      </button>
      <output
        className={styles.value}
        aria-live="polite"
        aria-labelledby={labelledBy}
        data-testid={testId}
      >
        {props.value}
      </output>
      <button
        type="button"
        className={cx(styles.round, styles.plus)}
        aria-label={props.increaseLabel}
        disabled={!canIncrease}
        onClick={props.onIncrease}
      >
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}
