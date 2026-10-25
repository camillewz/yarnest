// Écritures transactionnelles : une fonction par action utilisateur (docs/SPEC.md, section 4).
// Chaque fonction ouvre une transaction Dexie, écrit l'action et met à jour
// project.updatedAt et, en session, session.lastActivityAt. Rempli à partir du lot L2.
export {};
