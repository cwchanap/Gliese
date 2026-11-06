export const PLAYER_MOVEMENT_DIAGNOSTIC_EVENT = 'gliese:player-movement-diagnostic';

export interface PlayerMovementDiagnostic {
	mapId: string;
	previousPosition: { x: number; y: number };
	requestedPosition: { x: number; y: number };
	resolvedPosition: { x: number; y: number };
	blocked: boolean;
	camera?: {
		scrollX: number;
		scrollY: number;
		zoomX: number;
		zoomY: number;
		width: number;
		height: number;
		x: number;
		y: number;
	} | null;
}

/** Emits attempted player movement after collision resolution for runtime probes. */
export function emitPlayerMovementDiagnostic(
	detail: PlayerMovementDiagnostic,
	target?: EventTarget
): void {
	const resolvedTarget = target ?? (typeof window === 'undefined' ? null : window);
	if (!resolvedTarget) return;

	resolvedTarget.dispatchEvent(
		new CustomEvent<PlayerMovementDiagnostic>(PLAYER_MOVEMENT_DIAGNOSTIC_EVENT, { detail })
	);
}
