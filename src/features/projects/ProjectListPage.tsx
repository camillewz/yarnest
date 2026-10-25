import { useTranslation } from 'react-i18next';
import { IconLink } from '../../ui/IconLink';
import { Page } from '../../ui/Page';

/** E1 — Mes projets. */
export function ProjectListPage() {
  const { t } = useTranslation();
  return (
    <Page
      title={t('screens.projects.title')}
      actions={<IconLink to="/settings" label={t('app.settings')} icon="⚙" />}
    />
  );
}
