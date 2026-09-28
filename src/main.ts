import '@fontsource/spectral/400.css';
import '@fontsource/spectral/500.css';
import '@fontsource/spectral/600.css';
import '@fontsource/zen-maru-gothic/500.css';
import '@fontsource/zen-maru-gothic/700.css';
import '@fontsource/zen-maru-gothic/900.css';
import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

import { hydrateTauriStorage, flushPendingWrites } from '$lib/game/save/tauri-storage';
import { setSaveStorage } from '$lib/game/save/storage';

async function bootstrap() {
	const storage = await hydrateTauriStorage();
	setSaveStorage(storage);

	const { initializePreferences } = await import('$lib/game/i18n/store');
	initializePreferences();

	if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
		const { getCurrentWindow } = await import('@tauri-apps/api/window');
		const win = getCurrentWindow();
		await win.onCloseRequested(async (event) => {
			event.preventDefault();
			await flushPendingWrites();
			await win.destroy();
		});
	}

	mount(App, { target: document.getElementById('app')! });
}

bootstrap().catch((error) => {
	document.body.innerHTML = `<pre style="padding:2rem;font-family:monospace;color:#b00;">Couldn't start Gliese:\n\n${(error as Error).message}</pre>`;
	console.error(error);
});
