import {
  REMINDER_THRESHOLDS_MIN,
  continuousKnitStart,
  reminderMinutes,
  dueReminder,
  reminderChoicePatch,
  reminderShownPatch,
  pauseStartedReminderPatch,
  pauseRing,
} from './reminders';
import { at, iso, makePause, makeSession } from './testing';
import type { Pause, Session } from './types';

const due = (session: Session, pauses: Pause[], now: number, enabled = true) =>
  dueReminder({ session, pauses, now, remindersEnabled: enabled });

describe('paliers', () => {
  it('R1 à 30 min, R2 à 1 h, R3 à 2 h', () => {
    expect(REMINDER_THRESHOLDS_MIN).toEqual({ 1: 30, 2: 60, 3: 120 });
  });
});

describe('continuousKnitStart (RG06)', () => {
  it('sans pause → startedAt', () => {
    expect(continuousKnitStart(makeSession(), [])).toBe(at(0));
  });

  it('après des pauses → fin de la dernière pause', () => {
    expect(continuousKnitStart(makeSession(), [makePause(40, 45), makePause(10, 15)])).toBe(at(45));
  });

  it('pause en cours → aucun tricot continu', () => {
    expect(continuousKnitStart(makeSession(), [makePause(10, 15), makePause(40)])).toBeNull();
  });

  it('ignore les pauses d’une autre session', () => {
    const other = makePause(40, 45, { sessionId: 's2' });
    expect(continuousKnitStart(makeSession(), [other])).toBe(at(0));
  });
});

describe('dueReminder : paliers (RG06, RG09)', () => {
  it('rien avant 30 min', () => {
    expect(due(makeSession(), [], at(29.99))).toBeNull();
  });

  it('R1 à 30 min pile', () => {
    expect(due(makeSession(), [], at(30))).toBe(1);
  });

  it('CA3.5 : R1 déjà affiché → ne revient pas, même après rechargement', () => {
    const session = makeSession({ reminderStage: 1, lastReminderAt: iso(30) });
    expect(due(session, [], at(45))).toBeNull();
    expect(due(session, [], at(59.99))).toBeNull();
  });

  it('R2 à 1 h après R1', () => {
    expect(due(makeSession({ reminderStage: 1 }), [], at(60))).toBe(2);
  });

  it('CA3.6 : retour après 1 h 10 sans rappel affiché → seul R2', () => {
    expect(due(makeSession(), [], at(70))).toBe(2);
  });

  it('RG09 : retour après 2 h 10 sans rappel affiché → seul R3', () => {
    expect(due(makeSession(), [], at(130))).toBe(3);
    expect(due(makeSession({ reminderStage: 1 }), [], at(130))).toBe(3);
  });

  it('R3 à 2 h après R2', () => {
    expect(due(makeSession({ reminderStage: 2 }), [], at(120))).toBe(3);
  });

  it('mode on, R3 affiché → plus rien tant que l’utilisateur n’a pas choisi', () => {
    expect(
      due(makeSession({ reminderStage: 3, lastReminderAt: iso(120) }), [], at(300)),
    ).toBeNull();
  });

  it('pas de rappel pendant une pause', () => {
    expect(due(makeSession(), [makePause(25)], at(200))).toBeNull();
  });

  it('pas de rappel sur une session terminée', () => {
    expect(due(makeSession({ endedAt: iso(200) }), [], at(200))).toBeNull();
  });

  it('le décompte repart de la fin de la dernière pause', () => {
    const pauses = [makePause(25, 30)];
    expect(due(makeSession(), pauses, at(59.99))).toBeNull();
    expect(due(makeSession(), pauses, at(60))).toBe(1);
  });
});

describe('dueReminder : choix après R3 (RG07, RG08)', () => {
  const every30 = (overrides: Partial<Session> = {}) =>
    makeSession({
      remindersMode: 'every30',
      reminderStage: 3,
      lastReminderAt: iso(120),
      ...overrides,
    });

  it('CA3.7 : « Continuer » → un R3 toutes les 30 min', () => {
    expect(due(every30(), [], at(149.99))).toBeNull();
    expect(due(every30(), [], at(150))).toBe(3);
    const next = every30({ lastReminderAt: iso(150) });
    expect(due(next, [], at(179.99))).toBeNull();
    expect(due(next, [], at(180))).toBe(3);
  });

  it('« Continuer » sans lastReminderAt → décompte depuis le début du tricot continu', () => {
    expect(due(every30({ lastReminderAt: undefined }), [], at(30))).toBe(3);
  });

  it('« Continuer » puis pause → les paliers recommencent à R1', () => {
    const session = every30({ reminderStage: 0 });
    const pauses = [makePause(130, 135)];
    expect(due(session, pauses, at(164.99))).toBeNull();
    expect(due(session, pauses, at(165))).toBe(1);
  });

  it('CA3.7 : « Ne plus » → aucun rappel jusqu’à la fin, même après une pause', () => {
    const session = makeSession({ remindersMode: 'off', reminderStage: 0 });
    expect(due(session, [], at(500))).toBeNull();
    expect(due(session, [makePause(130, 135)], at(500))).toBeNull();
  });

  it('CA3.8 : rappels désactivés dans les réglages → jamais de rappel', () => {
    expect(due(makeSession(), [], at(30), false)).toBeNull();
    expect(due(makeSession(), [], at(500), false)).toBeNull();
    expect(due(every30(), [], at(500), false)).toBeNull();
  });
});

describe('patchs de session', () => {
  it('rappel affiché → palier et heure enregistrés', () => {
    expect(reminderShownPatch(2, at(60))).toEqual({ reminderStage: 2, lastReminderAt: iso(60) });
  });

  it('RG07 : choix après R3', () => {
    expect(reminderChoicePatch('continue')).toEqual({ remindersMode: 'every30' });
    expect(reminderChoicePatch('stop')).toEqual({ remindersMode: 'off' });
  });

  it('RG08 : une pause remet le palier à 0 sans toucher au mode', () => {
    const patch = pauseStartedReminderPatch();
    expect(patch).toEqual({ reminderStage: 0 });
    const session = { ...makeSession({ remindersMode: 'off', reminderStage: 3 }), ...patch };
    expect(session.remindersMode).toBe('off');
  });
});

describe('reminderMinutes : durée annoncée par le rappel', () => {
  it('palier atteint pour R1 et R2, même affichés en retard (RG09)', () => {
    expect(reminderMinutes(1, at(30), at(0))).toBe(30);
    expect(reminderMinutes(2, at(70), at(0))).toBe(60);
  });

  it('R3 : demi-heure entamée la plus proche, au moins 2 h', () => {
    expect(reminderMinutes(3, at(125), at(0))).toBe(120);
    expect(reminderMinutes(3, at(155), at(0))).toBe(150);
    expect(reminderMinutes(3, at(181), at(0))).toBe(180);
  });
});

describe('pauseRing (anneau de E4 vers la prochaine pause)', () => {
  const ring = (session: Session, pauses: Pause[], now: number, enabled = true) =>
    pauseRing({ session, pauses, now, remindersEnabled: enabled });

  it('avance de 0 à 30 min vers R1', () => {
    expect(ring(makeSession(), [], at(0))).toEqual({
      progress: 0,
      remainingMs: 30 * MIN,
      reminder: true,
    });
    expect(ring(makeSession(), [], at(15))).toEqual({
      progress: 0.5,
      remainingMs: 15 * MIN,
      reminder: true,
    });
  });

  it('puis de 30 à 60 min vers R2, de 60 à 120 min vers R3', () => {
    expect(ring(makeSession(), [], at(45))).toMatchObject({ progress: 0.5, remainingMs: 15 * MIN });
    expect(ring(makeSession(), [], at(90))).toMatchObject({ progress: 0.5, remainingMs: 30 * MIN });
  });

  it('repart de la fin de la dernière pause', () => {
    expect(ring(makeSession(), [makePause(35, 40)], at(55))).toMatchObject({
      progress: 0.5,
      remainingMs: 15 * MIN,
    });
  });

  it('pause ouverte ou session terminée → pas d’anneau', () => {
    expect(ring(makeSession(), [makePause(35)], at(40))).toBeNull();
    expect(ring(makeSession({ endedAt: iso(50) }), [], at(60))).toBeNull();
  });

  it('rappels désactivés ou coupés → tours de 30 min, sans rappel annoncé', () => {
    const expected = { progress: 0.5, remainingMs: 15 * MIN, reminder: false };
    expect(ring(makeSession(), [], at(45), false)).toEqual(expected);
    expect(ring(makeSession({ remindersMode: 'off' }), [], at(45))).toEqual(expected);
  });

  it('« Continuer » après R3 → 30 min après le dernier rappel', () => {
    const session = makeSession({
      remindersMode: 'every30',
      reminderStage: 3,
      lastReminderAt: iso(125),
    });
    expect(ring(session, [], at(140))).toEqual({
      progress: 0.5,
      remainingMs: 15 * MIN,
      reminder: true,
    });
  });

  it('R3 affiché sans choix → plus de rappel attendu, tours de 30 min', () => {
    const session = makeSession({ reminderStage: 3, lastReminderAt: iso(120) });
    expect(ring(session, [], at(135))).toMatchObject({ progress: 0.5, reminder: false });
  });

  it('palier atteint mais pas encore affiché → anneau plein', () => {
    expect(ring(makeSession({ reminderStage: 2 }), [], at(130))).toEqual({
      progress: 1,
      remainingMs: 0,
      reminder: true,
    });
  });
});
