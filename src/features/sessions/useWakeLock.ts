import { useEffect } from 'react';

/** Écran maintenu allumé pendant la session, redemandé au retour sur l'onglet (US2.4).
 * Sans Wake Lock (navigateur ancien, refus), la session reste utilisable sans message (CA2.7). */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | undefined;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) void next.release();
        else sentinel = next;
      } catch {
        // Refus ou économie d'énergie : sans conséquence.
      }
    };
    const onVisibility = () => void request();

    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, [enabled]);
}
