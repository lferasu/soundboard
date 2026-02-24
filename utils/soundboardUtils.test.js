import {
  MIN_BUTTON_SIZE,
  MAX_BUTTON_SIZE,
  shuffleArray,
  toLabel,
  calculateAdaptiveGrid
} from './soundboardUtils';

describe('shuffleArray', () => {
  it('returns a new array with same members', () => {
    const input = [1, 2, 3, 4, 5];
    const output = shuffleArray(input);

    expect(output).not.toBe(input);
    expect(output.slice().sort()).toEqual(input.slice().sort());
  });

  it('handles empty arrays', () => {
    expect(shuffleArray([])).toEqual([]);
  });
});

describe('toLabel', () => {
  it('strips extension and uppercases', () => {
    expect(toLabel('laser_beam.wav', 0)).toBe('LASER BEAM');
  });

  it('collapses whitespace and separators', () => {
    expect(toLabel('  scary---monster__sound  .mp3', 2)).toBe('SCARY MONSTER');
  });

  it('returns fallback label for empty values', () => {
    expect(toLabel('', 3)).toBe('SOUND 4');
    expect(toLabel(null, 0)).toBe('SOUND 1');
  });

  it('truncates long labels to 14 chars', () => {
    expect(toLabel('abcdefghijklmnopqrstuvwxyz.mp3', 0)).toHaveLength(14);
  });
});

describe('calculateAdaptiveGrid', () => {
  it('returns zero-count layout when maxCount is zero', () => {
    expect(calculateAdaptiveGrid(300, 200, 0)).toEqual({
      count: 0,
      size: MIN_BUTTON_SIZE,
      columns: 1
    });
  });

  it('returns a valid layout bounded by max button size', () => {
    const layout = calculateAdaptiveGrid(1400, 900, 20);

    expect(layout.count).toBe(20);
    expect(layout.columns).toBeGreaterThanOrEqual(1);
    expect(layout.columns).toBeLessThanOrEqual(10);
    expect(layout.size).toBeLessThanOrEqual(MAX_BUTTON_SIZE);
    expect(layout.size).toBeGreaterThanOrEqual(MIN_BUTTON_SIZE);
  });

  it('shrinks count when panel cannot fit all buttons', () => {
    const layout = calculateAdaptiveGrid(240, 140, 20);

    expect(layout.count).toBeLessThan(20);
    expect(layout.count).toBeGreaterThanOrEqual(1);
    expect(layout.size).toBeGreaterThanOrEqual(MIN_BUTTON_SIZE);
  });

  it('never returns columns above count', () => {
    const layout = calculateAdaptiveGrid(400, 280, 3);
    expect(layout.columns).toBeLessThanOrEqual(layout.count);
  });
});
