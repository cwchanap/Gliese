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

interface SkillFrontmatter {
	name: string;
	description: string;
}

const worldExpansionMarkdownFiles = [
	'.agents/skills/gliese-world-expansion/SKILL.md',
	'.agents/skills/gliese-world-expansion/references/authoring.md',
	'.agents/skills/gliese-world-expansion/references/validation.md',
	'.agents/skills/gliese-world-expansion/templates/expansion-brief.md'
] as const;

/**
 * Reads and parses YAML-like frontmatter from a skill Markdown file.
 *
 * Frontmatter is delimited by opening and closing `---` lines. Each line in
 * the frontmatter body is split on the first `:` into a key/value pair; lines
 * without a separator are skipped. The `name` and `description` keys are
 * returned, defaulting to an empty string when absent.
 *
 * @param skillPath - Repository-relative path to the skill Markdown file.
 * @returns The parsed `name` and `description` frontmatter values.
 */
function readSkillFrontmatter(skillPath: string): SkillFrontmatter {
	const markdown = readRepositoryFile(skillPath);
	const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(markdown);
	expect(match, `${skillPath} frontmatter`).not.toBeNull();

	const entries = new Map<string, string>();
	for (const line of match![1].split('\n')) {
		const separator = line.indexOf(':');
		if (separator === -1) continue;
		entries.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
	}

	return {
		name: entries.get('name') ?? '',
		description: entries.get('description') ?? ''
	};
}

function worldExpansionMarkdown(): string {
	return worldExpansionMarkdownFiles.map(readRepositoryFile).join('\n');
}

/**
 * Extracts repository-relative paths referenced in Markdown.
 *
 * Collects inline code spans (single backticks, single line) and fenced code
 * block contents (triple backticks), then matches paths beginning with an
 * approved root (`src`, `story`, `tools`, `public`, `.agents`, or `.claude`)
 * followed by a `/` and path characters. Returns the unique paths sorted
 * alphabetically.
 *
 * @param markdown - The Markdown text to scan.
 * @returns Sorted unique repository-relative paths found in code spans/blocks.
 */
function referencedRepositoryPaths(markdown: string): string[] {
	const codeFragments = [
		...[...markdown.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]),
		...[...markdown.matchAll(/```(?:[a-z]+)?\n([\s\S]*?)\n```/g)].flatMap((match) =>
			match[1].split('\n')
		)
	];
	const pathPattern =
		/(?:^|[\s('"=])((?:src|story|tools|public|\.agents|\.claude)\/[A-Za-z0-9_.\-/]+)/g;
	const paths = new Set<string>();

	for (const fragment of codeFragments) {
		for (const match of fragment.matchAll(pathPattern)) {
			paths.add(match[1]);
		}
	}

	return [...paths].sort();
}

function referencedPackageScripts(markdown: string): string[] {
	return [
		...new Set([...markdown.matchAll(/\bbun run ([a-z0-9:_-]+)/g)].map((match) => match[1]))
	].sort();
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

	it('defines the lean gliese-world-expansion skill contract', () => {
		const canonicalRoot = '.agents/skills/gliese-world-expansion';

		for (const path of worldExpansionMarkdownFiles) {
			expect(existsSync(repositoryPath(path)), path).toBe(true);
		}

		const frontmatter = readSkillFrontmatter(`${canonicalRoot}/SKILL.md`);
		expect(frontmatter.name).toBe('gliese-world-expansion');
		expect(frontmatter.description.startsWith('Use when ')).toBe(true);
		expect(frontmatter.description.length).toBeLessThanOrEqual(500);
		expectSymlinkTo('.claude/skills/gliese-world-expansion', canonicalRoot);
	});

	it('keeps world-expansion repository paths and bun scripts resolvable', () => {
		const markdown = worldExpansionMarkdown();
		const referencedPaths = referencedRepositoryPaths(markdown);
		const referencedScripts = referencedPackageScripts(markdown);
		const packageJson = JSON.parse(readRepositoryFile('package.json')) as {
			scripts?: Record<string, string>;
		};

		expect(referencedPaths.length).toBeGreaterThan(0);
		expect(referencedScripts.length).toBeGreaterThan(0);

		for (const path of referencedPaths) {
			expect(existsSync(repositoryPath(path)), path).toBe(true);
		}

		for (const script of referencedScripts) {
			expect(packageJson.scripts?.[script], `package.json script: ${script}`).toBeTypeOf('string');
		}
	});

	it('documents the actual map authoring sources in CLAUDE.md', () => {
		const guidance = readRepositoryFile('CLAUDE.md');

		expect(guidance).toContain('hand-authored `RegionFragment`');
		expect(guidance).toContain('`mergeRegions(...)`');
		expect(guidance).toContain('`village-layered.ts`');
		expect(guidance).toContain('`gliese-world-expansion`');
		expect(guidance).toContain('`2d-game-asset-workflow`');
		expect(guidance).not.toContain('regions/ (layered overworld) built');
		expect(guidance).not.toContain(
			'The overworld beyond the hub is authored as **layered regions**'
		);
	});
});
