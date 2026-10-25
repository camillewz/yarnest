// Son et vibration de fin de pause (US3.2). Le contexte audio est déverrouillé au tap
// « Faire une pause », seul geste garanti avant la fin du minuteur (section 8).

type AudioCtor = typeof AudioContext;
let context: AudioContext | undefined;

export function unlockAudio() {
  try {
    const Ctor: AudioCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    if (context.state === 'suspended') void context.resume();
  } catch {
    // Audio indisponible : la fin de pause reste visible à l'écran.
  }
}

/** Carillon doux de deux notes. */
export function chime() {
  const ctx = context;
  if (!ctx) return;
  try {
    const start = ctx.currentTime;
    [660, 880].forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = start + i * 0.35;
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  } catch {
    // Ignoré : le message à l'écran suffit.
  }
}

/** `navigator.vibrate` seulement si disponible (section 8). */
export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Ignoré.
  }
}
