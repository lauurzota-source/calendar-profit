export const IDEA_BUCKET_MS = 10_000; // 10 seconds

export function buildIdeaGroupKey(symbol: string, type: string, closeTime: Date) {
  const bucket = Math.floor(closeTime.getTime() / IDEA_BUCKET_MS);
  return `${symbol}-${type}-${bucket}`;
}

export function normalizeIdeaKey(symbol: string, type: string, closeTime: Date, fallback: string) {
  try {
    return buildIdeaGroupKey(symbol, type, closeTime);
  } catch {
    return fallback;
  }
}
