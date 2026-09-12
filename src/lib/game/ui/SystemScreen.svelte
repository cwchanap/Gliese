<script lang="ts">
	import { supportedLocales, type Locale } from '$lib/game/i18n/locales';
	import { locale, preferences, updatePreferences } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';

	interface Props {
		open: boolean;
		dialog?: HTMLDivElement;
		closeButton?: HTMLButtonElement;
		onClose: () => void;
		onkeydown: (event: KeyboardEvent) => void;
	}

	let {
		open,
		dialog = $bindable(),
		closeButton = $bindable(),
		onClose,
		onkeydown
	}: Props = $props();

	// Language options use native-script labels so each entry is readable in
	// the language it switches to.
	const nativeLocaleLabels: Record<Locale, string> = {
		en: 'English',
		ja: '日本語',
		'zh-Hant': '繁體中文'
	};

	let osReducedMotion = $state(false);
	let promptsRow = $state<HTMLDivElement>();

	$effect(() => {
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		osReducedMotion = query.matches;
		const onChange = (event: MediaQueryListEvent) => {
			osReducedMotion = event.matches;
		};
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	});

	// Effective reduced motion obeys BOTH the saved preference and the OS setting.
	const motionReduced = $derived($preferences.motion === 'reduced' || osReducedMotion);

	function focusPromptsRow(): void {
		promptsRow?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
	}
</script>

{#if open}
	<div class="jrpg-modal-backdrop" role="presentation">
		<div class="absolute inset-0 cursor-default" role="presentation" onclick={onClose}></div>
		<div
			bind:this={dialog}
			class="heroic-window heroic-anim"
			class:heroic-motion-reduced={motionReduced}
			aria-labelledby="system-heading"
			aria-modal="true"
			role="dialog"
			tabindex="-1"
			{onkeydown}
		>
			<div class="heroic-rail" role="tablist" aria-label={t($locale, 'ui.system')}>
				<div
					class="heroic-rail-card heroic-rail-card-selected"
					role="tab"
					aria-selected="true"
					aria-current="page"
				>
					<svg
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						aria-hidden="true"
					>
						<rect x="1.8" y="3" width="12.4" height="8.2" rx="1.2" />
						<path d="M5.8 13.8h4.4M8 11.2v2.6" />
					</svg>
					<span>{t($locale, 'ui.railDisplay')}</span>
				</div>
				<button
					type="button"
					role="tab"
					class="heroic-rail-card"
					aria-selected="false"
					disabled
					aria-describedby="system-audio-unavailable"
					title={t($locale, 'ui.audioUnavailable')}
				>
					<svg
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						aria-hidden="true"
					>
						<path d="M2.5 6.2v3.6h2.4L8.8 12.6V3.4L4.9 6.2H2.5z" />
						<path d="M11 5.6a3.6 3.6 0 0 1 0 4.8" />
					</svg>
					<span>{t($locale, 'ui.railAudio')}</span>
				</button>
				<span id="system-audio-unavailable" class="sr-only">
					{t($locale, 'ui.audioUnavailable')}
				</span>
				<button
					type="button"
					role="tab"
					class="heroic-rail-card"
					aria-selected="false"
					onclick={focusPromptsRow}
				>
					<svg
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						aria-hidden="true"
					>
						<rect x="1.5" y="4.6" width="13" height="6.8" rx="3.2" />
						<path d="M4.6 8h2.6M5.9 6.7v2.6" />
						<circle cx="10.9" cy="9.1" r="0.2" />
						<circle cx="12.4" cy="7" r="0.2" />
					</svg>
					<span>{t($locale, 'ui.railInput')}</span>
				</button>
			</div>

			<section class="system-content">
				<header class="system-header">
					<div>
						<p class="heroic-eyebrow">{t($locale, 'ui.system')}</p>
						<h2 id="system-heading" class="heroic-title">
							{t($locale, 'ui.systemTitle')}
						</h2>
					</div>
					<button
						bind:this={closeButton}
						type="button"
						class="glass-button jrpg-small-button"
						onclick={onClose}
					>
						{t($locale, 'ui.close')}
					</button>
				</header>

				<div class="heroic-rows heroic-stagger">
					<div class="heroic-row" data-testid="system-language-row">
						<span class="heroic-row-icon" aria-hidden="true">
							<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
								<circle cx="8" cy="8" r="5.7" />
								<path d="M2.3 8h11.4" />
								<ellipse cx="8" cy="8" rx="2.5" ry="5.7" />
							</svg>
						</span>
						<div class="heroic-row-copy">
							<p class="heroic-row-title">{t($locale, 'ui.language')}</p>
							<p class="heroic-row-subtitle">{t($locale, 'ui.systemLanguageHint')}</p>
						</div>
						<div class="heroic-segments" role="group" aria-label={t($locale, 'ui.language')}>
							{#each supportedLocales as option (option)}
								<button
									type="button"
									class="heroic-segment"
									class:heroic-segment-selected={$preferences.locale === option}
									aria-pressed={$preferences.locale === option}
									onclick={() => updatePreferences({ locale: option })}
								>
									{nativeLocaleLabels[option]}
								</button>
							{/each}
						</div>
					</div>

					<div class="heroic-row" data-testid="system-text-speed-row">
						<span class="heroic-row-icon" aria-hidden="true">
							<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M2.5 4.4h11M2.5 8h6.8M2.5 11.6h11" />
							</svg>
						</span>
						<div class="heroic-row-copy">
							<p class="heroic-row-title">{t($locale, 'ui.textSpeed')}</p>
							<p class="heroic-row-subtitle">{t($locale, 'ui.textSpeedHint')}</p>
						</div>
						<div class="heroic-segments" role="group" aria-label={t($locale, 'ui.textSpeed')}>
							<button
								type="button"
								class="heroic-segment"
								class:heroic-segment-selected={$preferences.textSpeed === 'slow'}
								aria-pressed={$preferences.textSpeed === 'slow'}
								onclick={() => updatePreferences({ textSpeed: 'slow' })}
							>
								{t($locale, 'ui.speedSlow')}
							</button>
							<button
								type="button"
								class="heroic-segment"
								class:heroic-segment-selected={$preferences.textSpeed === 'normal'}
								aria-pressed={$preferences.textSpeed === 'normal'}
								onclick={() => updatePreferences({ textSpeed: 'normal' })}
							>
								{t($locale, 'ui.speedNormal')}
							</button>
							<button
								type="button"
								class="heroic-segment"
								class:heroic-segment-selected={$preferences.textSpeed === 'instant'}
								aria-pressed={$preferences.textSpeed === 'instant'}
								onclick={() => updatePreferences({ textSpeed: 'instant' })}
							>
								{t($locale, 'ui.speedInstant')}
							</button>
						</div>
					</div>

					<div class="heroic-row" data-testid="system-hud-density-row">
						<span class="heroic-row-icon" aria-hidden="true">
							<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
								<rect x="2.4" y="2.4" width="4.6" height="4.6" rx="1" />
								<rect x="9" y="2.4" width="4.6" height="4.6" rx="1" />
								<rect x="2.4" y="9" width="4.6" height="4.6" rx="1" />
								<rect x="9" y="9" width="4.6" height="4.6" rx="1" />
							</svg>
						</span>
						<div class="heroic-row-copy">
							<p class="heroic-row-title">{t($locale, 'ui.hudDensity')}</p>
							<p class="heroic-row-subtitle">{t($locale, 'ui.hudDensityHint')}</p>
						</div>
						<div class="heroic-segments" role="group" aria-label={t($locale, 'ui.hudDensity')}>
							<button
								type="button"
								class="heroic-segment heroic-segment-selected"
								aria-pressed="true"
							>
								{t($locale, 'ui.densityQuiet')}
							</button>
							<button
								type="button"
								class="heroic-segment"
								disabled
								aria-describedby="system-density-full-unavailable"
								title={t($locale, 'ui.densityFullUnavailable')}
							>
								{t($locale, 'ui.densityFull')}
							</button>
						</div>
						<span id="system-density-full-unavailable" class="sr-only">
							{t($locale, 'ui.densityFullUnavailable')}
						</span>
					</div>

					<div class="heroic-row" data-testid="system-motion-row">
						<span class="heroic-row-icon" aria-hidden="true">
							<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M1.6 8h3.1l1.7-3.8 2.6 7.6L10.7 8h3.7" />
							</svg>
						</span>
						<div class="heroic-row-copy">
							<p class="heroic-row-title">{t($locale, 'ui.motion')}</p>
							<p class="heroic-row-subtitle">{t($locale, 'ui.motionHint')}</p>
						</div>
						<div class="heroic-segments" role="group" aria-label={t($locale, 'ui.motion')}>
							<button
								type="button"
								class="heroic-segment"
								class:heroic-segment-selected={$preferences.motion === 'on'}
								aria-pressed={$preferences.motion === 'on'}
								onclick={() => updatePreferences({ motion: 'on' })}
							>
								{t($locale, 'ui.motionOn')}
							</button>
							<button
								type="button"
								class="heroic-segment"
								class:heroic-segment-selected={$preferences.motion === 'reduced'}
								aria-pressed={$preferences.motion === 'reduced'}
								onclick={() => updatePreferences({ motion: 'reduced' })}
							>
								{t($locale, 'ui.motionReduced')}
							</button>
						</div>
					</div>

					<div class="heroic-row" bind:this={promptsRow} data-testid="system-prompts-row">
						<span class="heroic-row-icon" aria-hidden="true">
							<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
								<rect x="1.5" y="4.6" width="13" height="6.8" rx="3.2" />
								<path d="M4.6 8h2.6M5.9 6.7v2.6" />
								<circle cx="10.9" cy="9.1" r="0.2" />
								<circle cx="12.4" cy="7" r="0.2" />
							</svg>
						</span>
						<div class="heroic-row-copy">
							<p class="heroic-row-title">{t($locale, 'ui.prompts')}</p>
							<p class="heroic-row-subtitle">{t($locale, 'ui.promptsHint')}</p>
						</div>
						<div class="heroic-segments" role="group" aria-label={t($locale, 'ui.prompts')}>
							<button
								type="button"
								class="heroic-segment"
								class:heroic-segment-selected={$preferences.promptMode === 'auto'}
								aria-pressed={$preferences.promptMode === 'auto'}
								onclick={() => updatePreferences({ promptMode: 'auto' })}
							>
								{t($locale, 'ui.promptAuto')}
							</button>
							<button
								type="button"
								class="heroic-segment"
								class:heroic-segment-selected={$preferences.promptMode === 'pad'}
								aria-pressed={$preferences.promptMode === 'pad'}
								onclick={() => updatePreferences({ promptMode: 'pad' })}
							>
								{t($locale, 'ui.promptPad')}
							</button>
							<button
								type="button"
								class="heroic-segment"
								class:heroic-segment-selected={$preferences.promptMode === 'keys'}
								aria-pressed={$preferences.promptMode === 'keys'}
								onclick={() => updatePreferences({ promptMode: 'keys' })}
							>
								{t($locale, 'ui.promptKeys')}
							</button>
						</div>
					</div>
				</div>
			</section>
		</div>
	</div>
{/if}

<style>
	.jrpg-modal-backdrop {
		position: absolute;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(2, 3, 10, 0.72);
		padding: 1rem;
		backdrop-filter: blur(3px);
	}

	.system-content {
		display: flex;
		flex: 1;
		min-width: 0;
		min-height: 0;
		flex-direction: column;
	}

	.system-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	@media (max-width: 900px) {
		.heroic-window {
			flex-direction: column;
		}

		.heroic-rail {
			grid-template-columns: repeat(3, 1fr);
			width: 100%;
		}
	}
</style>
