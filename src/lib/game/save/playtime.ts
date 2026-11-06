let baseSeconds = 0;
let startedAtMs: number | null = null;

/**
 * Restart playtime accumulation for a run. `startSeconds` seeds the tracker
 * with the playtime restored from the slot record (0 for a new run).
 */
export function resetPlaytime(startSeconds = 0): void {
	baseSeconds = startSeconds;
	startedAtMs = Date.now();
}

export function getPlaytimeSeconds(): number {
	if (startedAtMs === null) return baseSeconds;
	return baseSeconds + Math.floor((Date.now() - startedAtMs) / 1000);
}

/** Format a playtime duration as unambiguous `h:mm:ss` (e.g. 96s reads `0:01:36`). */
export function formatPlaytimeSeconds(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
