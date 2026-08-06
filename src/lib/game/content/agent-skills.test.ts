import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

function repositoryPath(path: string): string {
	return resolve(repositoryRoot, path);
}

function readRepositoryFile(path: string): string {
	return readFileSync(repositoryPath(path), 'utf8');
}

function expectSymlinkTo(linkPath: string, targetPath: string): void {
	const absoluteLink = repositoryPath(linkPath);
	const absoluteTarget = repositoryPath(targetPath);

	expect(existsSync(absoluteLink)).toBe(true);
	expect(lstatSync(absoluteLink).isSymbolicLink()).toBe(true);
	expect(realpathSync(absoluteLink)).toBe(realpathSync(absoluteTarget));
}

describe('project agent skills', () => {
	it('keeps 2d-game-asset-workflow in one canonical cross-agent directory', () => {
		const canonicalRoot = '.agents/skills/2d-game-asset-workflow';
		const requiredFiles = [
			`${canonicalRoot}/SKILL.md`,
			`${canonicalRoot}/agents/openai.yaml`,
			`${canonicalRoot}/scripts/inspect_png_alpha.py`,
			`${canonicalRoot}/scripts/remove_border_background.py`
		];

		for (const path of requiredFiles) {
			expect(existsSync(repositoryPath(path)), path).toBe(true);
		}

		expectSymlinkTo('.codex/skills/2d-game-asset-workflow', canonicalRoot);
		expectSymlinkTo('.claude/skills/2d-game-asset-workflow', canonicalRoot);

		const skill = readRepositoryFile(`${canonicalRoot}/SKILL.md`);
		expect(skill).toContain('Vite, Svelte, and Phaser');
		expect(skill).toContain('public/game/assets/');
		expect(skill).toContain('.agents/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py');
		expect(skill).not.toContain('SvelteKit');
		expect(skill).not.toContain('static/game/assets/');
	});
});
