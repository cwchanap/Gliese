/**
 * Pure directional focus resolution for Heroic menus (keyboard now, gamepad
 * in Task 11). Grid geometry only — no DOM, no Phaser.
 *
 * Semantics:
 * - move to the nearest enabled node in the movement half-plane — the closest
 *   row/column ahead wins, then the smallest cross-axis drift (document order
 *   breaks remaining ties), so uneven grids never strand focus,
 * - stay on the current node when nothing lies in that direction,
 * - a null/unknown current resolves to the first enabled node (document order),
 * - no enabled node at all resolves to null.
 */
export type MenuFocusDirection = 'up' | 'down' | 'left' | 'right';

export type MenuFocusNode = {
	id: string;
	row: number;
	column: number;
	disabled?: boolean;
};

/**
 * Resolves the next focus id for a directional move over the focus lattice.
 * @param nodes - Focusable nodes with grid coordinates; disabled nodes are skipped.
 * @param currentId - Currently focused node id, or `null` when nothing is focused.
 * @param direction - Direction of the attempted move.
 * @returns The target node id, or `null` when no enabled node exists.
 */
export function resolveMenuFocusTarget(
	nodes: readonly MenuFocusNode[],
	currentId: string | null,
	direction: MenuFocusDirection
): string | null {
	const enabled = nodes.find((node) => !node.disabled);
	if (!enabled) return null;

	const current = currentId === null ? undefined : nodes.find((node) => node.id === currentId);
	if (!current || current.disabled) return enabled.id;

	const vertical = direction === 'up' || direction === 'down';
	const step = direction === 'down' || direction === 'right' ? 1 : -1;

	// Same row/column first: the nearest enabled node in the direction, gaps
	// and disabled nodes skipped.
	let aligned: MenuFocusNode | null = null;
	let alignedAxis = Number.POSITIVE_INFINITY;
	// Uneven-grid fallback: the nearest row/column ahead, least cross drift.
	let fallback: MenuFocusNode | null = null;
	let fallbackAxis = Number.POSITIVE_INFINITY;
	let fallbackCross = Number.POSITIVE_INFINITY;
	for (const node of nodes) {
		if (node.disabled || node.id === current.id) continue;
		const axisDelta = (vertical ? node.row - current.row : node.column - current.column) * step;
		if (axisDelta <= 0) continue;
		const crossDelta = Math.abs(vertical ? node.column - current.column : node.row - current.row);
		if (crossDelta === 0) {
			if (axisDelta < alignedAxis) {
				aligned = node;
				alignedAxis = axisDelta;
			}
			continue;
		}
		if (axisDelta < fallbackAxis || (axisDelta === fallbackAxis && crossDelta < fallbackCross)) {
			fallback = node;
			fallbackAxis = axisDelta;
			fallbackCross = crossDelta;
		}
	}

	return (aligned ?? fallback)?.id ?? current.id;
}
