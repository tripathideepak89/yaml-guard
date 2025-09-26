export function truncate(text: string, max = 80): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function pluralize(word: string, count: number): string {
  return count === 1 ? word : word + 's';
}

export function formatCounts(counts: { [k: string]: number }): string {
  return Object.entries(counts)
    .filter(([, v]) => v)
    .map(([k, v]) => `${v} ${pluralize(k, v)}`)
    .join(', ');
}
