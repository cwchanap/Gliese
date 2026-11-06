export const PLAYER_MOVEMENT_DIAGNOSTIC_EVENT = 'gliese:player-movement-diagnostic';
export const HERO_RENDER_PROBE_REQUEST_EVENT = 'gliese:hero-render-probe-request';
export const HERO_RENDER_PROBE_EVENT = 'gliese:hero-render-probe';

export interface DiagnosticCameraSnapshot {
	scrollX: number;
	scrollY: number;
	zoomX: number;
	zoomY: number;
	width: number;
	height: number;
	x: number;
	y: number;
}

export interface PlayerMovementDiagnostic {
	mapId: string;
	previousPosition: { x: number; y: number };
	requestedPosition: { x: number; y: number };
	resolvedPosition: { x: number; y: number };
	blocked: boolean;
	camera?: DiagnosticCameraSnapshot | null;
}

export interface HeroRenderProbe {
	mapId: string;
	spritePosition: { x: number; y: number } | null;
	camera: DiagnosticCameraSnapshot | null;
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

export function emitHeroRenderProbe(detail: HeroRenderProbe, target?: EventTarget): void {
	const resolvedTarget = target ?? (typeof window === 'undefined' ? null : window);
	if (!resolvedTarget) return;

	resolvedTarget.dispatchEvent(
		new CustomEvent<HeroRenderProbe>(HERO_RENDER_PROBE_EVENT, { detail })
	);
}

export function onHeroRenderProbeRequest(handler: () => void, target?: EventTarget): () => void {
	const resolvedTarget = target ?? (typeof window === 'undefined' ? null : window);
	if (!resolvedTarget) return () => {};

	resolvedTarget.addEventListener(HERO_RENDER_PROBE_REQUEST_EVENT, handler);
	return () => resolvedTarget.removeEventListener(HERO_RENDER_PROBE_REQUEST_EVENT, handler);
}
