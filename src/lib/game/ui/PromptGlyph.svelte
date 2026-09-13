<script lang="ts">
	import type { PromptMode } from '$lib/game/i18n/preferences';
	import { lastInputModality, resolvePromptModality } from '$lib/game/core/gamepad';

	interface Props {
		mode: PromptMode;
		/** Label shown for keyboard prompts. */
		keys: string;
		/** Label shown for gamepad prompts. */
		pad: string;
		/** Visual treatment: default dark keycap, console face buttons, white Enter cap. */
		tone?: 'default' | 'a' | 'b' | 'enter';
	}

	let { mode, keys, pad, tone = 'default' }: Props = $props();

	// Auto follows the last real input modality (pad input flips to pad, any
	// key flips back) — the glyphs always name the controls that actually work.
	const resolved = $derived(resolvePromptModality(mode, $lastInputModality));
	// A/B circle tones are pad face-button styling; keyboard prompts always
	// render as keycaps so glyphs never wear the wrong device's clothes.
	const resolvedTone = $derived(resolved === 'pad' ? tone : 'enter');
</script>

<kbd class="heroic-prompt-glyph" data-prompt={resolved} data-tone={resolvedTone}>
	{resolved === 'pad' ? pad : keys}
</kbd>
