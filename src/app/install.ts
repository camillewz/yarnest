import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallState {
  prompt: BeforeInstallPromptEvent | null;
  installed: boolean;
}

const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Invitation à installer (Chrome Android) ; Safari iOS n'en a pas et passe par Partager. */
export const useInstall = create<InstallState>(() => ({ prompt: null, installed: false }));

export function listenForInstall() {
  useInstall.setState({ installed: standalone() });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useInstall.setState({ prompt: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () =>
    useInstall.setState({ prompt: null, installed: true }),
  );
}

export async function promptInstall() {
  const { prompt } = useInstall.getState();
  if (!prompt) return;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  useInstall.setState({ prompt: null, installed: outcome === 'accepted' });
}

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
