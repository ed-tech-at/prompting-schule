import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import InfoBlocks from './InfoBlocks.svelte';

describe('InfoBlocks.svelte', () => {
  it('renders nothing without blocks', () => {
    const { container } = render(InfoBlocks, { blocks: [] });
    expect(container.querySelector('.infoblocks')).toBeNull();
  });

  it('renders nothing when the prop is omitted entirely', () => {
    const { container } = render(InfoBlocks, {});
    expect(container.querySelector('.infoblocks')).toBeNull();
  });

  it('renders the content as HTML, not as escaped text', () => {
    render(InfoBlocks, {
      blocks: [
        {
          id: 1,
          content: '<p>Am Sonntag ist <strong>Wartung</strong>.</p>',
          variant: 'info' as const
        }
      ]
    });

    expect(screen.getByText('Wartung').tagName).toBe('STRONG');
  });

  it('marks the variant with a css class, except for the default', () => {
    const { container } = render(InfoBlocks, {
      blocks: [
        { id: 1, content: 'Info', variant: 'info' as const },
        { id: 2, content: 'Warnung', variant: 'warning' as const },
        { id: 3, content: 'Erfolg', variant: 'success' as const }
      ]
    });

    const marks = [...container.querySelectorAll('mark.infoblock')];
    expect(marks).toHaveLength(3);
    expect(marks[0].classList.contains('variant-warning')).toBe(false);
    expect(marks[0].classList.contains('variant-success')).toBe(false);
    expect(marks[1].classList.contains('variant-warning')).toBe(true);
    expect(marks[2].classList.contains('variant-success')).toBe(true);
  });

  it('keeps the given order', () => {
    const { container } = render(InfoBlocks, {
      blocks: [
        { id: 5, content: 'Erster', variant: 'info' as const },
        { id: 2, content: 'Zweiter', variant: 'info' as const }
      ]
    });

    const texts = [...container.querySelectorAll('mark.infoblock')].map((mark) =>
      mark.textContent?.trim()
    );
    expect(texts).toEqual(['Erster', 'Zweiter']);
  });
});
