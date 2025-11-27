export function getOrdinalSuffix(num: number): string {
  if (num === 1) return "st";
  if (num === 2) return "nd";
  if (num === 3) return "rd";
  return "th";
}

export function formatRank(rank: number): string {
  return `${rank}${getOrdinalSuffix(rank)}`;
}
