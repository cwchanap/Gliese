import type { MeadowEntryPaintedMode } from '$lib/game/content/backgrounds/meadow-entry-painted-v2-runtime';

export const REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT =
	'gliese:regional-background-renderer-diagnostic';

export interface RegionalBackgroundRendererDiagnostic {
	renderer: 'webgl' | 'canvas';
	paintedMode: MeadowEntryPaintedMode;
	maxTextureSize: number | null;
	regionalBackgroundLoadMs: number | null;
	regionalBackgroundLoadCompletions: number;
}

export interface RegionalBackgroundRendererDiagnosticInput {
	renderer: 'webgl' | 'canvas';
	paintedMode: MeadowEntryPaintedMode;
	maxTextureSize: number | null;
	loadStartedAtMs: number | null;
	loadCompletedAtMs: number | null;
	regionalBackgroundLoadCompletions: number;
}

/**
 * Builds a normalized `RegionalBackgroundRendererDiagnostic` from raw preload
 * timing and renderer-capability inputs. Normalization rules:
 *   - `regionalBackgroundLoadMs` is the clamped (>=0) difference between the
 *     completed and started timestamps, or `null` when either is non-finite.
 *   - `maxTextureSize` is preserved only for the `webgl` renderer when finite
 *     and positive; otherwise it is coerced to `null` (canvas has no limit).
 *   - `regionalBackgroundLoadCompletions` is coerced to a non-negative integer
 *     (non-finite inputs become 0).
 *   - `renderer` is passed through unchanged.
 *
 * @param input - Raw diagnostic inputs: renderer type, optional max texture
 *   size, load start/completed timestamps (ms), and regional background load
 *   completion count.
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
	const regionalBackgroundLoadCompletions = Number.isFinite(input.regionalBackgroundLoadCompletions)
		? Math.max(0, Math.floor(input.regionalBackgroundLoadCompletions))
		: 0;

	return {
		renderer: input.renderer,
		paintedMode: input.paintedMode,
		maxTextureSize,
		regionalBackgroundLoadMs: hasFiniteTimestamps
			? Math.max(0, input.loadCompletedAtMs! - input.loadStartedAtMs!)
			: null,
		regionalBackgroundLoadCompletions
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
