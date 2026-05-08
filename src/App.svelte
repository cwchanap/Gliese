<script lang="ts">
	import GameShell from '$lib/game/GameShell.svelte';
	import favicon from '$lib/assets/favicon.svg';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<GameShell />
