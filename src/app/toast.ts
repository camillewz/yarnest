import { create } from 'zustand';

type ToastKey = 'errors.storage' | 'settings.importDone' | 'settings.importError';

interface ToastState {
  message: ToastKey | null;
  show: (message: ToastKey) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  hide: () => set({ message: null }),
}));

/** Exécute une écriture ; une erreur IndexedDB s'affiche dans un message non bloquant (section 8). */
export async function safely<T>(action: () => Promise<T>): Promise<T | undefined> {
  try {
    return await action();
  } catch (error) {
    console.error(error);
    useToast.getState().show('errors.storage');
    return undefined;
  }
}
