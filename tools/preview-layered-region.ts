import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
	renderComposedCollisionSvg,
	renderLayeredPreviews
} from '$lib/game/content/maps/layered/preview';
import { pathsRegion } from '$lib/game/content/maps/regions/paths';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';

const outDir = join(process.cwd(), '.artifacts/previews/sundrop-village');
mkdirSync(outDir, { recursive: true });

const files = new Map(renderLayeredPreviews(sundropVillageLayered));
files.set(
	'village-composed-collision.svg',
	renderComposedCollisionSvg(sundropVillageLayered, pathsRegion.blockers ?? [])
);

for (const [name, content] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
	writeFileSync(join(outDir, name), content, 'utf8');
	console.log(`wrote ${name}`);
}
