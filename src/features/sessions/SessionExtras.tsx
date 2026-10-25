import type { Pause, Project, Session } from '../../domain/types';
import { Reminders } from '../reminders/Reminders';

interface SessionExtrasProps {
  session: Session;
  project: Project;
  pauses: Pause[];
  now: number;
  onPause: () => void;
}

/** Surcouches de E4 : rappels de pause R1 à R3. */
export function SessionExtras({ session, pauses, now, onPause }: SessionExtrasProps) {
  return <Reminders session={session} pauses={pauses} now={now} onPause={onPause} />;
}
