import type { MapBackgroundPlane } from '$lib/game/content/maps/types';

export const REGIONAL_BACKGROUND_PLANE_RENDER_DIAGNOSTIC_EVENT =
	'gliese:regional-background-plane-render-diagnostic';

export type RegionalBackgroundRenderStatus =
	| 'disabled'
	| 'rendered'
	| 'missing-texture'
	| 'invalid-dimensions'
	| 'render-failed';

export interface RegionalBackgroundPlaneRenderDiagnosticEntry {
	id: string;
	textureKey: string;
	plane: MapBackgroundPlane;
	expectedDimensions: { width: number; height: number };
	observedDimensions: { width: number; height: number } | null;
	renderTransform?: {
		x: number;
		y: number;
		originX: number;
		originY: number;
		displayWidth: number;
		displayHeight: number;
		depth: number;
	};
	status: RegionalBackgroundRenderStatus;
}

export interface RegionalBackgroundPlaneRenderDiagnostic {
	mapId: string;
	regionalBackgroundsEnabled: boolean;
	entries: readonly RegionalBackgroundPlaneRenderDiagnosticEntry[];
	successfulBackgroundIds: readonly string[];
	/** Fallback-only blocker IDs drawn live after applying this exact plane-success set. */
	selectedFallbackBlockerIds?: readonly string[];
	/** Sum of Math.ceil(max(blocker.width, blocker.height) / 48) for selected fallbacks. */
	selectedFallbackBlockerSegmentCount?: number;
}

export function emitRegionalBackgroundPlaneRenderDiagnostic(
	detail: RegionalBackgroundPlaneRenderDiagnostic,
	target?: EventTarget
): void {
	const resolvedTarget = target ?? (typeof window === 'undefined' ? null : window);
	if (!resolvedTarget) return;

	resolvedTarget.dispatchEvent(
		new CustomEvent<RegionalBackgroundPlaneRenderDiagnostic>(
			REGIONAL_BACKGROUND_PLANE_RENDER_DIAGNOSTIC_EVENT,
			{
				detail: {
					...detail,
					successfulBackgroundIds: [...detail.successfulBackgroundIds].sort()
				}
			}
		)
	);
}
