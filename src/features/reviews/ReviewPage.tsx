import { useTranslation } from 'react-i18next';
import { Page } from '../../ui/Page';

/** E6 — Bilan de session. */
export function ReviewPage() {
  const { t } = useTranslation();
  return <Page title={t('screens.review.title')} />;
}
