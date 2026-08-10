import type { MapRect } from '$lib/game/content/maps/types';

export interface LayoutPoint {
	readonly x: number;
	readonly y: number;
}

export interface LayoutRect extends LayoutPoint {
	readonly width: number;
	readonly height: number;
}

export interface NamedLayoutRect extends LayoutRect {
	readonly id: string;
}

export function point(x: number, y: number): LayoutPoint {
	return { x, y };
}

export function rect(x: number, y: number, width: number, height: number): LayoutRect {
	return { x, y, width, height };
}

export function namedRect(
	id: string,
	x: number,
	y: number,
	width: number,
	height: number
): NamedLayoutRect {
	return { id, x, y, width, height };
}

export function toMapRect(id: string, value: LayoutRect): MapRect {
	return {
		id,
		x: value.x + value.width / 2,
		y: value.y + value.height / 2,
		width: value.width,
		height: value.height
	};
}

export function rectContains(outer: LayoutRect, inner: LayoutRect): boolean {
	return (
		inner.x >= outer.x &&
		inner.y >= outer.y &&
		inner.x + inner.width <= outer.x + outer.width &&
		inner.y + inner.height <= outer.y + outer.height
	);
}

export function rectsOverlap(left: LayoutRect, right: LayoutRect): boolean {
	return (
		left.x < right.x + right.width &&
		left.x + left.width > right.x &&
		left.y < right.y + right.height &&
		left.y + left.height > right.y
	);
}

export function rectsConnect(left: LayoutRect, right: LayoutRect): boolean {
	if (rectsOverlap(left, right)) return true;
	const sharedVerticalEdge =
		(left.x + left.width === right.x || right.x + right.width === left.x) &&
		Math.max(left.y, right.y) < Math.min(left.y + left.height, right.y + right.height);
	const sharedHorizontalEdge =
		(left.y + left.height === right.y || right.y + right.height === left.y) &&
		Math.max(left.x, right.x) < Math.min(left.x + left.width, right.x + right.width);
	return sharedVerticalEdge || sharedHorizontalEdge;
}

export function rectClearance(left: LayoutRect, right: LayoutRect): number {
	const gapX = Math.max(left.x - (right.x + right.width), right.x - (left.x + left.width), 0);
	const gapY = Math.max(left.y - (right.y + right.height), right.y - (left.y + left.height), 0);
	return Math.hypot(gapX, gapY);
}

export function layoutRectContainsPoint(value: LayoutRect, candidate: LayoutPoint): boolean {
	return (
		candidate.x >= value.x &&
		candidate.x <= value.x + value.width &&
		candidate.y >= value.y &&
		candidate.y <= value.y + value.height
	);
}

export function expandedLayoutRectContainsPoint(
	value: LayoutRect,
	candidate: LayoutPoint,
	padding: number
): boolean {
	return (
		candidate.x >= value.x - padding &&
		candidate.x <= value.x + value.width + padding &&
		candidate.y >= value.y - padding &&
		candidate.y <= value.y + value.height + padding
	);
}
