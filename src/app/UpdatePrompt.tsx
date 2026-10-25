import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import styles from './Toast.module.css';

/** Service worker : hors ligne après la première visite, message « Nouvelle version » (section 8). */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className={styles.toast} role="status">
      <p>{t('pwa.update')}</p>
      <Button variant="primary" onClick={() => void updateServiceWorker(true)}>
        {t('pwa.reload')}
      </Button>
    </div>
  );
}
