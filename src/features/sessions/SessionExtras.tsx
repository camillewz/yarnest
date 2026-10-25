import type { Pause, Project, Session } from '../../domain/types';
import { DueCounterReminders } from '../counterReminders/CounterReminders';
import { Reminders } from '../reminders/Reminders';

interface SessionExtrasProps {
  session: Session;
  project: Project;
  pauses: Pause[];
  now: number;
  onPause: () => void;
}

/** Surcouches de E4 : rappels de pause R1 à R3 et rappels de rangs atteints. */
export function SessionExtras({ session, project, pauses, now, onPause }: SessionExtrasProps) {
  return (
    <>
      <Reminders session={session} pauses={pauses} now={now} onPause={onPause} />
      <DueCounterReminders project={project} />
    </>
  );
}
