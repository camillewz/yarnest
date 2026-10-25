// Entités métier stockées dans IndexedDB (docs/SPEC.md, section 4).
// Définies ici pour que le domaine ne dépende jamais de la couche données.

export type ProjectStatus = 'todo' | 'active' | 'paused' | 'done';
export type Technique = 'knit' | 'crochet';
export type BodyZone = 'neck' | 'back' | 'shoulders' | 'elbows' | 'wrists' | 'hands' | 'eyes';

export interface Project {
  id: string; // UUID
  name: string; // obligatoire, 1 à 60 caractères
  technique?: Technique;
  note?: string; // laine, aiguilles, crochet ; 500 caractères max
  status: ProjectStatus; // défaut 'todo'
  rowCount: number; // >= 0
  stitchCount: number; // >= 0, remis à 0 à chaque +1 rang
  createdAt: string;
  updatedAt: string; // sert au tri « dernière activité »
}

export interface Session {
  id: string;
  projectId: string;
  startedAt: string;
  endedAt?: string; // absent = session active
  endReason?: 'manual' | 'auto12h';
  lastActivityAt: string; // mis à jour par chaque action, même transaction
  rowsAtStart: number;
  rowsAtEnd?: number; // rowCount figé à la fin de la session (RG12)
  remindersMode: 'on' | 'every30' | 'off';
  reminderStage: 0 | 1 | 2 | 3; // dernier palier affiché depuis la dernière pause
  lastReminderAt?: string;
  manualKnitSeconds?: number; // correction manuelle (US6.2), prioritaire sur le calcul
}

export interface Pause {
  id: string;
  sessionId: string;
  startedAt: string;
  plannedMinutes: number; // multiple de 5, de 5 à 60
  endedAt?: string; // posé au tap « Reprendre » ou « Arrêter la pause »
}

export interface Review {
  sessionId: string; // clé primaire, 1 bilan max par session
  mood?: 1 | 2 | 3 | 4 | 5;
  zones: BodyZone[]; // [] = « Aucune »
  note?: string; // 500 caractères max
  createdAt: string;
}

export interface CounterReminder {
  // Should have
  id: string;
  projectId: string;
  atRow: number;
  kind: 'increase' | 'decrease' | 'cutYarn' | 'custom';
  label?: string;
  doneAt?: string;
}

export type Locale = 'fr' | 'en';
