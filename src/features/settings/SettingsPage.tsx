import { useTranslation } from 'react-i18next';
import { Page } from '../../ui/Page';

/** E7 — Réglages. */
export function SettingsPage() {
  const { t } = useTranslation();
  return <Page title={t('screens.settings.title')} backTo="/" />;
}
