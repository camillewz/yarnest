import type { Project, Session } from '../../domain/types';

interface SessionExtrasProps {
  session: Session;
  project: Project;
  now: number;
  onPause: () => void;
}

/** Surcouches de E4 ajoutées au lot L4 (rappels R1 à R3) et L6 (rappels de rangs). */
export function SessionExtras(props: SessionExtrasProps) {
  void props;
  return null;
}
