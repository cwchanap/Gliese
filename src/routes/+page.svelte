<svelte:head>
	<title>Gliese</title>
</svelte:head>

<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
	<h1 class="text-4xl font-semibold tracking-tight">Gliese</h1>
	<p class="max-w-xl text-base text-slate-600">
		A small vertical slice for the JRPG prototype. Launch the game shell to boot the Phaser
		runtime.
	</p>
	<button
		type="button"
		class="rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white"
		onclick={() => goto('/game')}
	>
		Open game
	</button>
</div>
