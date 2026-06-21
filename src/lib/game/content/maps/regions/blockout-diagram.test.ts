import { writeFileSync, mkdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { meadowEntryMap } from '$lib/game/content/maps';
import { routeSceneDefinitions } from '$lib/game/content/maps/regions/route-scenes';
import { softMazeRooms } from '$lib/game/content/maps/regions/rooms';

// Generates top-down blockout diagrams (SVG) from the live map data so the
// navigational silhouette is reviewable without running the game. Env-guarded:
// a no-op unless GENERATE_DIAGRAM=1, so it never runs in the normal suite.
const OUT_DIR = 'docs/superpowers/reports/blockout-diagrams';

type Rect = { id: string; x: number; y: number; width: number; height: number };

function solids(): Rect[] {
	const m = meadowEntryMap;
	return [
		...(m.blockers ?? []).map((b) => ({ ...b })),
		...(m.fences ?? []).map((f) => ({ ...f })),
		...(m.landmarks ?? []).map((l) => ({ ...l })),
		...(m.mapDecor ?? []).filter((d) => d.collision).map((d) => ({ ...d.collision!, id: d.id }))
	];
}

function svgForRoute(routeId: string): string {
	const route = routeSceneDefinitions.find((r) => r.id === routeId)!;
	const waypoints = route.mainRoute;
	const xs = waypoints.map((p) => p.x);
	const ys = waypoints.map((p) => p.y);
	const pad = 700;
	const minX = Math.min(...xs) - pad;
	const minY = Math.min(...ys) - pad;
	const maxX = Math.max(...xs) + pad;
	const maxY = Math.max(...ys) + pad;
	const w = maxX - minX;
	const h = maxY - minY;
	const inView = (r: Rect) =>
		r.x + r.width / 2 > minX &&
		r.x - r.width / 2 < maxX &&
		r.y + r.height / 2 > minY &&
		r.y - r.height / 2 < maxY;

	const rooms = softMazeRooms.filter((rm) => inView(rm.bounds));
	const ss = solids().filter(inView);

	const parts: string[] = [];
	parts.push(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w / 4}" height="${h / 4}">`
	);
	parts.push(`<rect width="${w}" height="${h}" fill="#0d1117"/>`);
	// rooms
	for (const rm of rooms) {
		const rx = rm.bounds.x - rm.bounds.width / 2 - minX;
		const ry = rm.bounds.y - rm.bounds.height / 2 - minY;
		parts.push(
			`<rect x="${rx}" y="${ry}" width="${rm.bounds.width}" height="${rm.bounds.height}" fill="#1f2937" stroke="#374151" stroke-width="2"/>`
		);
		parts.push(
			`<text x="${rx + 6}" y="${ry + 16}" fill="#9ca3af" font-size="22" font-family="monospace">${rm.id}</text>`
		);
	}
	// solids
	for (const s of ss) {
		const sx = s.x - s.width / 2 - minX;
		const sy = s.y - s.height / 2 - minY;
		parts.push(
			`<rect x="${sx}" y="${sy}" width="${s.width}" height="${s.height}" fill="#b91c1c" fill-opacity="0.55" stroke="#ef4444" stroke-width="1"/>`
		);
	}
	// route polyline
	const pts = waypoints.map((p) => `${p.x - minX},${p.y - minY}`).join(' ');
	parts.push(
		`<polyline points="${pts}" fill="none" stroke="#22d3ee" stroke-width="6" stroke-opacity="0.9"/>`
	);
	for (const p of waypoints) {
		parts.push(`<circle cx="${p.x - minX}" cy="${p.y - minY}" r="14" fill="#22d3ee"/>`);
	}
	parts.push(
		`<text x="12" y="28" fill="#e5e7eb" font-size="26" font-family="monospace">${route.id} — cyan=route, red=boundaries, gray=rooms</text>`
	);
	parts.push('</svg>');
	return parts.join('\n');
}

describe('blockout diagram generator', () => {
	it('renders each route with boundaries, rooms, and the route polyline', () => {
		// Always validate the generator output structurally; only persist to disk
		// when GENERATE_DIAGRAM=1 so the normal suite stays side-effect-free.
		const generate = process.env.GENERATE_DIAGRAM === '1';
		if (generate) mkdirSync(OUT_DIR, { recursive: true });
		for (const route of routeSceneDefinitions) {
			const svg = svgForRoute(route.id);
			expect(svg).toContain('<polyline');
			expect(svg).toContain('fill="#b91c1c"'); // at least one boundary solid
			expect(svg).toContain('fill="#1f2937"'); // at least one room
			if (generate) writeFileSync(`${OUT_DIR}/${route.id}.svg`, svg);
		}
		expect(routeSceneDefinitions.length).toBe(5);
	});
});
