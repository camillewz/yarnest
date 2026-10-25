import { useTranslation } from 'react-i18next';
import { Page } from '../../ui/Page';

/** E3 — Fiche projet. */
export function ProjectDetailPage() {
  const { t } = useTranslation();
  return <Page title={t('screens.project.title')} backTo="/" />;
}
