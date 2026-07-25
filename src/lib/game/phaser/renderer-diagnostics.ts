export const REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT =
	'gliese:regional-background-renderer-diagnostic';

export interface RegionalBackgroundRendererDiagnostic {
	renderer: 'webgl' | 'canvas';
	maxTextureSize: number | null;
	regionalBackgroundLoadMs: number | null;
	regionalBackgroundLoadCompletions: number;
}

export interface RegionalBackgroundRendererDiagnosticInput {
	renderer: 'webgl' | 'canvas';
	maxTextureSize: number | null;
	loadStartedAtMs: number | null;
	loadCompletedAtMs: number | null;
	regionalBackgroundLoadCompletions: number;
}

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
