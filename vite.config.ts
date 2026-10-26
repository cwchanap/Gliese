import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import path from 'node:path';

// Asset-byte tests that hash/decode real Git LFS-tracked PNGs. Core CI
// checks out without LFS, so these must be skipped there; they run in the
// Asset Integrity workflow, which fetches LFS. Gated by env var so the Asset
// Integrity workflow (which doesn't set it) still runs them.
const lfsAssetTestFiles = ['src/lib/game/content/village-interior-assets.asset.test.ts'];
const skipLfsAssetTests = process.env.CI_SKIP_LFS_ASSET_TESTS === '1';

export default defineConfig({
	plugins: [tailwindcss(), svelte()],
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, 'src/lib')
		}
	},
	server: {
		port: 5173,
		strictPort: true
	},
	preview: {
		port: 4173,
		strictPort: true
	},
	// Pre-bundle the Tauri modules that only main.ts reaches. Discovering them mid-run makes
	// Vite reload the browser test page, which flakily fails whichever spec is importing.
	optimizeDeps: {
		include: ['@tauri-apps/api/window', '@tauri-apps/plugin-fs']
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					testTimeout: 60_000,
					hookTimeout: 60_000,
					include: [
						'src/**/*.{test,spec}.{js,ts}',
						// vitest-native and CI-safe tools specs: no LFS assets, no
						// bun:test/node:test imports, CPU-cheap.
						'tools/validate-heroic-ui-art.test.ts'
					],
					exclude: [
						'src/**/*.svelte.{test,spec}.{js,ts}',
						...(skipLfsAssetTests ? lfsAssetTestFiles : [])
					]
				}
			}
		]
	}
});
