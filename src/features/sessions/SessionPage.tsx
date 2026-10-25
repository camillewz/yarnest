import { useTranslation } from 'react-i18next';
import { Page } from '../../ui/Page';

/** E4 — Session en cours ; E5 (pause) s'affiche en plein écran sur cette même route. */
export function SessionPage() {
  const { t } = useTranslation();
  return <Page title={t('screens.session.title')} backTo="/" />;
}
