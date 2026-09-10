<script lang="ts">
	import type { PromptMode } from '$lib/game/i18n/preferences';

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

	let gamepadCount = $state(0);

	$effect(() => {
		const readGamepads = () => {
			gamepadCount =
				typeof navigator.getGamepads === 'function'
					? Array.from(navigator.getGamepads()).filter(Boolean).length
					: 0;
		};
		readGamepads();
		window.addEventListener('gamepadconnected', readGamepads);
		window.addEventListener('gamepaddisconnected', readGamepads);
		return () => {
			window.removeEventListener('gamepadconnected', readGamepads);
			window.removeEventListener('gamepaddisconnected', readGamepads);
		};
	});

	// Auto shows pad glyphs once a gamepad is connected, keyboard glyphs otherwise.
	const resolved = $derived(mode === 'auto' ? (gamepadCount > 0 ? 'pad' : 'keys') : mode);
</script>

<kbd class="heroic-prompt-glyph" data-prompt={resolved} data-tone={tone}>
	{resolved === 'pad' ? pad : keys}
</kbd>
