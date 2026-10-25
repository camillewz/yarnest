import { Minus, Plus } from 'lucide-react';
import { Button } from './Button';
import styles from './Stepper.module.css';

interface StepperProps {
  value: string;
  decreaseLabel: string;
  increaseLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease: boolean;
  canIncrease: boolean;
}

export function Stepper(props: StepperProps) {
  return (
    <div className={styles.stepper}>
      <Button
        className={styles.round}
        aria-label={props.decreaseLabel}
        disabled={!props.canDecrease}
        onClick={props.onDecrease}
      >
        <Minus aria-hidden="true" />
      </Button>
      <output className={styles.value} aria-live="polite">
        {props.value}
      </output>
      <Button
        className={styles.round}
        aria-label={props.increaseLabel}
        disabled={!props.canIncrease}
        onClick={props.onIncrease}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}
