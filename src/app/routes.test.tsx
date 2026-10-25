import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { initI18n } from '../i18n';
import { routes } from './routes';

const cases = [
  ['/', 'Mes projets', 'My projects'],
  ['/projects/new', 'Nouveau projet', 'New project'],
  ['/projects/abc', 'Fiche projet', 'Project'],
  ['/projects/abc/edit', 'Modifier le projet', 'Edit project'],
  ['/session', 'Session en cours', 'Current session'],
  ['/sessions/abc/review', 'Bilan de session', 'Session review'],
  ['/settings', 'Réglages', 'Settings'],
] as const;

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);
}

describe.each(['fr', 'en'] as const)('routes en %s', (locale) => {
  beforeAll(async () => {
    await initI18n(locale).changeLanguage(locale);
  });

  it.each(cases)('%s affiche son titre', (path, frTitle, enTitle) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      locale === 'fr' ? frTitle : enTitle,
    );
  });
});

it('une route inconnue ramène à E1', async () => {
  await initI18n('fr').changeLanguage('fr');
  renderAt('/nimporte-quoi');
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Mes projets');
});
