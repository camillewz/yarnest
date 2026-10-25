import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { useSetting } from '../db/hooks';
import { getSetting, runAutoClose, setSetting } from '../db/repo';
import { useClockTicker } from './clock';
import { safely } from './toast';
import { Onboarding } from './Onboarding';
import { Toast } from './Toast';
import { UpdatePrompt } from './UpdatePrompt';

const AUTO_CLOSE_CHECK_MS = 60_000;

/** Racine de toutes les routes : horloge, langue choisie, clôture 12 h, persistance. */
export function AppShell() {
  const { i18n } = useTranslation();
  const locale = useSetting('locale');
  const onboarded = useSetting('onboardingDone');
  useClockTicker();

  useEffect(() => {
    if (locale?.value && locale.value !== i18n.language) void i18n.changeLanguage(locale.value);
  }, [locale, i18n]);

  // RG10 : à l'ouverture puis chaque minute.
  useEffect(() => {
    const check = () => void safely(() => runAutoClose(Date.now()));
    check();
    const id = window.setInterval(check, AUTO_CLOSE_CHECK_MS);
    return () => window.clearInterval(id);
  }, []);

  // RG15 : demande de stockage persistant au premier lancement.
  useEffect(() => {
    void safely(async () => {
      if ((await getSetting('storagePersisted')) !== undefined) return;
      const persisted = (await navigator.storage?.persist?.()) ?? false;
      await setSetting('storagePersisted', persisted);
    });
  }, []);

  return (
    <>
      <Outlet />
      {onboarded && !onboarded.value && <Onboarding />}
      <Toast />
      <UpdatePrompt />
    </>
  );
}
