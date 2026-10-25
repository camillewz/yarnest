import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { initI18n } from './i18n';
import './styles/reset.css';
import './styles/fonts.css';
import './styles/tokens.css';

initI18n();

const root = document.getElementById('root');
if (!root) throw new Error('#root introuvable dans index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
