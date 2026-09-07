import { describe, expect, it } from 'vitest';
import { en } from './en';
import { ja } from './ja';
import { zhHant } from './zh-Hant';

function leafPaths(value: unknown, prefix = ''): string[] {
	if (typeof value === 'string') return [prefix];
	if (!value || typeof value !== 'object') return [];
	return Object.entries(value).flatMap(([key, child]) =>
		leafPaths(child, prefix ? `${prefix}.${key}` : key)
	);
}

describe('locale parity', () => {
	it('ja covers every English leaf path', () => {
		expect(new Set(leafPaths(ja))).toEqual(new Set(leafPaths(en)));
	});

	it('zh-Hant covers every English leaf path', () => {
		expect(new Set(leafPaths(zhHant))).toEqual(new Set(leafPaths(en)));
	});
});
