import { IconContext } from '@phosphor-icons/react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { routes } from './routes';

const router = createBrowserRouter(routes);
const ICONS = { size: 24 };

export function App() {
  // Taille par défaut des icônes Phosphor (1em sinon) ; les CSS qui la fixent restent prioritaires.
  return (
    <IconContext.Provider value={ICONS}>
      <RouterProvider router={router} />
    </IconContext.Provider>
  );
}
