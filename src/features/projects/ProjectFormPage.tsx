import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Page } from '../../ui/Page';

/** E2 — Nouveau projet (sans `:id`) ou modification (avec `:id`). */
export function ProjectFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  return id ? (
    <Page title={t('screens.projectEdit.title')} backTo={`/projects/${id}`} />
  ) : (
    <Page title={t('screens.projectNew.title')} backTo="/" />
  );
}
