export const MIN_BUTTON_SIZE = 34;
export const MAX_BUTTON_SIZE = 126;
export const GRID_GAP = 10;

export function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function toLabel(name, fallbackIndex) {
  const withoutExtension = (name || '').replace(/\s*\.[a-z0-9]{2,5}$/i, '');
  const trimmed = withoutExtension.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return `SOUND ${fallbackIndex + 1}`;
  }
  return trimmed.slice(0, 14).trimEnd().toUpperCase();
}

export function calculateAdaptiveGrid(panelWidth, panelHeight, maxCount) {
  const countCap = Math.max(0, maxCount);
  if (!countCap) {
    return { count: 0, size: MIN_BUTTON_SIZE, columns: 1 };
  }

  const usableWidth = Math.max(200, panelWidth - 20);
  const usableHeight = Math.max(110, panelHeight - 24);

  for (let count = countCap; count >= 1; count -= 1) {
    let bestForCount = null;

    for (let columns = 1; columns <= Math.min(10, count); columns += 1) {
      const rows = Math.ceil(count / columns);
      const sizeByWidth = (usableWidth - GRID_GAP * (columns - 1)) / columns;
      const sizeByHeight = (usableHeight - GRID_GAP * (rows - 1)) / rows;
      const candidateSize = Math.floor(Math.min(sizeByWidth, sizeByHeight));

      if (candidateSize < MIN_BUTTON_SIZE) {
        continue;
      }

      const clampedSize = Math.min(candidateSize, MAX_BUTTON_SIZE);
      if (!bestForCount || clampedSize > bestForCount.size) {
        bestForCount = { count, size: clampedSize, columns };
      }
    }

    if (bestForCount) {
      return bestForCount;
    }
  }

  return { count: 1, size: MIN_BUTTON_SIZE, columns: 1 };
}
