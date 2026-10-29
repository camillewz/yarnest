import { render } from '@testing-library/react';
import { Digits } from './Digits';

describe('Digits', () => {
  it('garde le texte d’un seul tenant, une case masquée par caractère', () => {
    const { container } = render(<Digits value="12:05" />);
    expect(container).toHaveTextContent(/^12:05$/);
    const boxes = container.querySelectorAll('[aria-hidden="true"]');
    expect([...boxes].map((b) => b.getAttribute('data-char')).join('')).toBe('12:05');
    expect([...boxes].every((b) => b.textContent === '')).toBe(true);
  });

  it('accepte un nombre', () => {
    const { container } = render(<Digits value={42} />);
    expect(container).toHaveTextContent(/^42$/);
  });
});
