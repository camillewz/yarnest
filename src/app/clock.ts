import { useEffect } from 'react';
import { create } from 'zustand';

/** Horloge d'affichage : un tick par seconde et à chaque retour sur l'onglet (RG02).
 * Rien n'est compté ici, les durées se recalculent depuis les horodatages stockés. */
export const useClock = create<{ now: number }>(() => ({ now: Date.now() }));

export const useNow = () => useClock((s) => s.now);

export function useClockTicker() {
  useEffect(() => {
    const tick = () => useClock.setState({ now: Date.now() });
    const id = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, []);
}
