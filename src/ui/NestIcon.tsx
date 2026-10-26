/** Le nid de Yarnest et son œuf, en formes abstraites (pas de pelote). Trait de la couleur du texte. */
export function NestIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="4.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <ellipse cx="32" cy="19" rx="8" ry="10" />
      <path d="M8 30c3 14 45 14 48 0" />
      <path d="M8 30c8 4 16-3 24 0s16 4 24 0" />
      <path d="M15 40c6.5-3 11.5 2 17 0s10.5-3 17 0" />
    </svg>
  );
}
