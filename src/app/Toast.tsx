import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { useToast } from './toast';
import styles from './Toast.module.css';

export function Toast() {
  const { t } = useTranslation();
  const { message, hide } = useToast();
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(hide, 6000);
    return () => window.clearTimeout(id);
  }, [message, hide]);
  return (
    <div role="status" aria-live="polite">
      {message && (
        <div className={styles.toast}>
          <p>{t(message)}</p>
          <Button
            variant="ghost"
            className={styles.close}
            aria-label={t('app.close')}
            onClick={hide}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
