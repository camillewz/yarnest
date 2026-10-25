import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
  large?: boolean;
}

export function Button({
  variant = 'secondary',
  block,
  large,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        styles.button,
        styles[variant],
        block && styles.block,
        large && styles.large,
        className,
      )}
      {...props}
    />
  );
}

export const buttonClass = (variant: ButtonVariant = 'secondary', block = false) =>
  cx(styles.button, styles[variant], block && styles.block);
