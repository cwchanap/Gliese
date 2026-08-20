import type { MapBackgroundPlane } from '$lib/game/content/maps/types';
import type { MeadowEntryPaintedMode } from '$lib/game/content/backgrounds/meadow-entry-painted-v2-runtime';

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
	/** @deprecated Compatibility evidence for existing Meadow probes. */
	paintedMode?: MeadowEntryPaintedMode;
	packageId: string | null;
	requiredBackgroundIds: readonly string[];
	selectedBackgroundIds: readonly string[];
	presentationMode: 'painted' | 'fallback';
	entries: readonly RegionalBackgroundPlaneRenderDiagnosticEntry[];
	successfulBackgroundIds: readonly string[];
	/** Blocker IDs drawn live after applying this exact package-success set and ownership policy. */
	selectedFallbackBlockerIds?: readonly string[];
	/** Sum of Math.ceil(max(blocker.width, blocker.height) / 48) for selected blockers. */
	selectedFallbackBlockerSegmentCount?: number;
	selectedFallbackDecorIds: string[];
	selectedFallbackFenceIds: string[];
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
					requiredBackgroundIds: [...detail.requiredBackgroundIds],
					selectedBackgroundIds: [...detail.selectedBackgroundIds],
					successfulBackgroundIds: [...detail.successfulBackgroundIds].sort()
				}
			}
		)
	);
}
