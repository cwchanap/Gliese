import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import sharp from 'sharp';

import { MAP_BACKGROUND_DEPTHS } from '$lib/game/content/maps/background-ownership';
import {
	buildSundropVillageObstacleControlInputs,
	buildSundropVillageObstacleOcclusionProofCases,
	computeSundropVillageObstacleControlFingerprint
} from '$lib/game/content/backgrounds/sundrop-village-obstacle-controls';

const root = process.cwd();
const reports = join(root, 'docs/superpowers/reports/img/hpa-398');
const basePath = join(root, 'public/game/assets/regions/sundrop-village-base.png');
const foregroundPath = join(root, 'public/game/assets/regions/sundrop-village-foreground.png');
const animationPath = join(root, 'public/game/assets/animation-pack.png');
const basePng = readFileSync(basePath);
const foregroundPng = readFileSync(foregroundPath);

function sha256(contents: Uint8Array): string {
	return createHash('sha256').update(contents).digest('hex');
}

async function writeProof(
	filename: string,
	png: Buffer
): Promise<{ path: string; sha256: string }> {
	const path = join(reports, filename);
	writeFileSync(path, png);
	return { path: relative(root, path), sha256: sha256(png) };
}

function labelSvg(width: number, label: string): Buffer {
	return Buffer.from(
		`<svg width="${width}" height="32" xmlns="http://www.w3.org/2000/svg">` +
			'<rect width="100%" height="32" fill="#101820" fill-opacity="0.88"/>' +
			`<text x="12" y="22" fill="#ffffff" font-size="16" font-family="sans-serif">${label}</text>` +
			'</svg>'
	);
}

async function labeledPlayerView(
	label: string,
	crop: { left: number; top: number; width: number; height: number },
	player: { x: number; y: number },
	heroPng: Buffer
): Promise<Buffer> {
	const [baseCrop, foregroundCrop] = await Promise.all([
		sharp(basePng).extract(crop).png().toBuffer(),
		sharp(foregroundPng).extract(crop).png().toBuffer()
	]);
	return sharp(baseCrop)
		.composite([
			{
				input: heroPng,
				left: player.x - crop.left - 44,
				top: player.y - crop.top - 45
			},
			{ input: foregroundCrop },
			{ input: labelSvg(crop.width, label), left: 0, top: 0 }
		])
		.png()
		.toBuffer();
}

async function checkerboard(width: number, height: number): Promise<Buffer> {
	const data = Buffer.alloc(width * height * 4);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const light = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0;
			const value = light ? 216 : 170;
			const offset = (y * width + x) * 4;
			data[offset] = value;
			data[offset + 1] = value;
			data[offset + 2] = value;
			data[offset + 3] = 255;
		}
	}
	return sharp(data, { raw: { width, height, channels: 4 } })
		.png()
		.toBuffer();
}

async function main(): Promise<void> {
	const controlInputs = buildSundropVillageObstacleControlInputs(root);
	const proofCases = buildSundropVillageObstacleOcclusionProofCases(controlInputs);
	const hedge = proofCases.find((proofCase) => proofCase.motif === 'hedge')!;
	const lowWall = proofCases.find((proofCase) => proofCase.motif === 'low-wall')!;
	const [baseReview, foregroundReview, heroPng] = await Promise.all([
		sharp(basePng).resize(896, 768).png().toBuffer(),
		sharp(foregroundPng).resize(896, 768).png().toBuffer(),
		sharp(animationPath)
			.extract({ left: 0, top: 0, width: 192, height: 192 })
			.resize(88, 90)
			.png()
			.toBuffer()
	]);
	const compositeReview = await sharp(baseReview)
		.composite([{ input: foregroundReview }])
		.png()
		.toBuffer();
	const foregroundOnTransparency = await sharp(await checkerboard(896, 768))
		.composite([{ input: foregroundReview }])
		.png()
		.toBuffer();

	const edgeBoard = sharp({
		create: { width: 1024, height: 768, channels: 4, background: '#101820' }
	});
	const [top, bottom, left, right] = await Promise.all([
		sharp(compositeReview).extract({ left: 0, top: 0, width: 896, height: 112 }).toBuffer(),
		sharp(compositeReview).extract({ left: 0, top: 656, width: 896, height: 112 }).toBuffer(),
		sharp(compositeReview).extract({ left: 0, top: 112, width: 112, height: 544 }).toBuffer(),
		sharp(compositeReview).extract({ left: 784, top: 112, width: 112, height: 544 }).toBuffer()
	]);
	const edgeProof = await edgeBoard
		.composite([
			{ input: top, left: 64, top: 32 },
			{ input: bottom, left: 64, top: 624 },
			{ input: left, left: 64, top: 128 },
			{ input: right, left: 848, top: 128 },
			{ input: labelSvg(768, 'All four crop edges — final normal composite'), left: 128, top: 368 }
		])
		.png()
		.toBuffer();

	const corridorCrop = { left: 940, top: 900, width: 800, height: 300 };
	const [corridorBase, corridorForeground] = await Promise.all([
		sharp(basePng).extract(corridorCrop).png().toBuffer(),
		sharp(foregroundPng).extract(corridorCrop).png().toBuffer()
	]);
	const corridorProof = await sharp(corridorBase)
		.composite([
			{ input: corridorForeground },
			{ input: labelSvg(corridorCrop.width, 'Corrected bottom corridor seam'), left: 0, top: 0 }
		])
		.png()
		.toBuffer();

	const proofBuffers: Record<string, Buffer> = {
		'village-obstacle-proof-base.png': baseReview,
		'village-obstacle-proof-foreground.png': foregroundOnTransparency,
		'village-obstacle-proof-composite.png': compositeReview,
		'village-obstacle-proof-crop-edges.png': edgeProof,
		'village-obstacle-proof-corridor-seam.png': corridorProof,
		'village-obstacle-proof-hedge-behind.png': await labeledPlayerView(
			`Hedge ${hedge.blockerId} — behind/north (${hedge.player.behind.centerDeltaFromCutoffPx}px from cutoff)`,
			hedge.crop,
			hedge.player.behind.local,
			heroPng
		),
		'village-obstacle-proof-hedge-front.png': await labeledPlayerView(
			`Hedge ${hedge.blockerId} — front/south (+${hedge.player.front.centerDeltaFromCutoffPx}px from cutoff)`,
			hedge.crop,
			hedge.player.front.local,
			heroPng
		),
		'village-obstacle-proof-wall-behind.png': await labeledPlayerView(
			`Low wall ${lowWall.blockerId} — behind/north (${lowWall.player.behind.centerDeltaFromCutoffPx}px from cutoff)`,
			lowWall.crop,
			lowWall.player.behind.local,
			heroPng
		),
		'village-obstacle-proof-wall-front.png': await labeledPlayerView(
			`Low wall ${lowWall.blockerId} — front/south (+${lowWall.player.front.centerDeltaFromCutoffPx}px from cutoff)`,
			lowWall.crop,
			lowWall.player.front.local,
			heroPng
		)
	};
	const outputs = Object.fromEntries(
		await Promise.all(
			Object.entries(proofBuffers).map(async ([filename, png]) => [
				filename,
				await writeProof(filename, png)
			])
		)
	);
	const manifest = {
		version: 2,
		inputs: {
			base: { path: relative(root, basePath), sha256: sha256(basePng) },
			foreground: { path: relative(root, foregroundPath), sha256: sha256(foregroundPng) },
			hero: {
				path: relative(root, animationPath),
				frame: { x: 0, y: 0, width: 192, height: 192 }
			},
			controlFingerprint: computeSundropVillageObstacleControlFingerprint(controlInputs)
		},
		playerDisplaySize: { width: 88, height: 90 },
		runtimeLayering: {
			baseDepth: MAP_BACKGROUND_DEPTHS.base,
			playerDepth: 0,
			foregroundDepth: MAP_BACKGROUND_DEPTHS.foreground,
			backgrounds: controlInputs.map.backgroundImages
		},
		proofCases,
		outputs
	};
	writeFileSync(
		join(reports, 'village-obstacle-visual-proof.json'),
		`${JSON.stringify(manifest, null, 2)}\n`
	);
}

await main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
