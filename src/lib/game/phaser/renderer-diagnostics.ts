export const REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT =
	'gliese:regional-background-renderer-diagnostic';

export interface RegionalBackgroundRendererDiagnostic {
	renderer: 'webgl' | 'canvas';
	packageIds: readonly string[];
	requiredAssetKeys: readonly string[];
	completedAssetKeys: readonly string[];
	maxTextureSize: number | null;
	regionalBackgroundLoadMs: number | null;
}

export interface RegionalBackgroundRendererDiagnosticInput {
	renderer: 'webgl' | 'canvas';
	packageIds: readonly string[];
	requiredAssetKeys: readonly string[];
	completedAssetKeys: readonly string[];
	maxTextureSize: number | null;
	loadStartedAtMs: number | null;
	loadCompletedAtMs: number | null;
}

function sortedUnique(values: readonly string[]): readonly string[] {
	return Object.freeze([...new Set(values)].sort());
}

/**
 * Builds a normalized `RegionalBackgroundRendererDiagnostic` from raw preload
 * timing and renderer-capability inputs. Normalization rules:
 *   - `regionalBackgroundLoadMs` is the clamped (>=0) difference between the
 *     completed and started timestamps, or `null` when either is non-finite.
 *   - `maxTextureSize` is preserved only for the `webgl` renderer when finite
 *     and positive; otherwise it is coerced to `null` (canvas has no limit).
 *   - Package and asset inventories are copied, deduplicated, and sorted so
 *     one preload can describe packages for several maps deterministically.
 *   - `renderer` is passed through unchanged.
 *
 * @param input - Raw diagnostic inputs: renderer type, optional max texture
 *   size, load start/completed timestamps (ms), and package asset inventories.
 * @returns The normalized, emit-ready diagnostic record.
 */
export function buildRegionalBackgroundRendererDiagnostic(
	input: RegionalBackgroundRendererDiagnosticInput
): RegionalBackgroundRendererDiagnostic {
	const hasFiniteTimestamps =
		Number.isFinite(input.loadStartedAtMs) && Number.isFinite(input.loadCompletedAtMs);
	const maxTextureSize =
		input.renderer === 'webgl' && Number.isFinite(input.maxTextureSize) && input.maxTextureSize! > 0
			? input.maxTextureSize
			: null;
	return {
		renderer: input.renderer,
		packageIds: sortedUnique(input.packageIds),
		requiredAssetKeys: sortedUnique(input.requiredAssetKeys),
		completedAssetKeys: sortedUnique(input.completedAssetKeys),
		maxTextureSize,
		regionalBackgroundLoadMs: hasFiniteTimestamps
			? Math.max(0, input.loadCompletedAtMs! - input.loadStartedAtMs!)
			: null
	};
}

export function emitRegionalBackgroundRendererDiagnostic(
	detail: RegionalBackgroundRendererDiagnostic,
	target?: Window
): void {
	const resolvedTarget = target ?? (typeof window === 'undefined' ? null : window);
	if (!resolvedTarget) {
		return;
	}

	resolvedTarget.dispatchEvent(
		new CustomEvent<RegionalBackgroundRendererDiagnostic>(
			REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT,
			{ detail }
		)
	);
}
