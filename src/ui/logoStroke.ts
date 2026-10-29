/**
 * Épaisseur du trait du symbole, en unités du logo (hauteur 108), selon sa hauteur affichée.
 * Le symbole est dessiné d'un trait égal ; les lettres « arnest » ont des fûts pleins et des
 * déliés. En petit, les déliés s'effacent : le trait vaut le fût des lettres pour ne pas les
 * écraser. En grand, les contrastes se lisent : il prend 10 % de plus (valeur de la maquette)
 * pour garder la même présence que le mot. Entre les deux, il s'épaissit progressivement.
 */
export const LETTER_STEM = 8.97; // Fût de « n », « r », « t » dans la maquette.
const SMALL = 24; // px : en dessous, trait = fût.
const LARGE = 96; // px : au-dessus, trait = fût × 1,1.
const LARGE_GAIN = 1.1;
const LEAF_RATIO = 0.92; // Feuilles / tige sur la maquette (9,1 / 9,9).

export function logoStroke(heightPx: number): { stem: number; leaf: number } {
  const t = Math.min(1, Math.max(0, (heightPx - SMALL) / (LARGE - SMALL)));
  const stem = LETTER_STEM * (1 + (LARGE_GAIN - 1) * t);
  return { stem, leaf: stem * LEAF_RATIO };
}
