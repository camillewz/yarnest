import styles from './Digits.module.css';

/**
 * Chiffres à largeur fixe pour Fraunces, qui n'a pas de chiffres tabulaires : chaque chiffre
 * occupe la chasse du « 0 » (le plus large), le minuteur ne bouge pas en défilant.
 * Le texte réel reste d'un seul tenant (lecteurs d'écran, textContent) ; les cases à largeur
 * fixe sont dessinées en CSS et masquées de l'accessibilité, sinon « 12 » se lirait « 1 2 ».
 */
export function Digits({ value }: { value: string | number }) {
  const text = String(value);
  return (
    <>
      <span className="visually-hidden">{text}</span>
      {[...text].map((char, i) => (
        <span
          key={i}
          className={/\d/.test(char) ? styles.digit : styles.char}
          data-char={char}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
