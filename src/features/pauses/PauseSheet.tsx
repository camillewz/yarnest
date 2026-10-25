import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_PAUSE_MINUTES, MIN_PAUSE_MINUTES, stepPauseMinutes } from '../../domain/pauses';
import { Button } from '../../ui/Button';
import { Sheet } from '../../ui/Overlay';
import { Stepper } from '../../ui/Stepper';

interface PauseSheetProps {
  initialMinutes: number;
  onLaunch: (minutes: number) => void;
  onClose: () => void;
}

/** Réglage de la durée avant lancement (RG05). */
export function PauseSheet({ initialMinutes, onLaunch, onClose }: PauseSheetProps) {
  const { t } = useTranslation();
  const [minutes, setMinutes] = useState(initialMinutes);
  return (
    <Sheet title={t('pause.sheetTitle')} onClose={onClose}>
      <Stepper
        value={t('pause.minutes', { count: minutes })}
        decreaseLabel={t('pause.decrease')}
        increaseLabel={t('pause.increase')}
        canDecrease={minutes > MIN_PAUSE_MINUTES}
        canIncrease={minutes < MAX_PAUSE_MINUTES}
        onDecrease={() => setMinutes((m) => stepPauseMinutes(m, -1))}
        onIncrease={() => setMinutes((m) => stepPauseMinutes(m, 1))}
      />
      <Button variant="primary" block large onClick={() => onLaunch(minutes)}>
        {t('pause.launch')}
      </Button>
    </Sheet>
  );
}
