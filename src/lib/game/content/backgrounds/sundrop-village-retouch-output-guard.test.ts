import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./sundrop-village-png', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./sundrop-village-png')>();
	return {
		...actual,
		SUNDROP_VILLAGE_PNG_OPTIONS: { ...actual.SUNDROP_VILLAGE_PNG_OPTIONS, compressionLevel: 0 }
	};
});

const { retouchSundropVillagePng, SUNDROP_VILLAGE_RETOUCH_INPUT_PATH } =
	await import('./sundrop-village-retouch');

const INPUT_PATH = join(process.cwd(), SUNDROP_VILLAGE_RETOUCH_INPUT_PATH);

let inputPng: Buffer;

beforeAll(async () => {
	inputPng = await readFile(INPUT_PATH);
});

describe('Sundrop Village retouch controller-approved output guard', () => {
	it('rejects when the encoded PNG no longer matches the controller-approved SHA-256', async () => {
		await expect(retouchSundropVillagePng(inputPng)).rejects.toThrow(
			/controller-approved opaque output SHA-256 must remain/
		);
	});
});
