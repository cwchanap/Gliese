/**
 * Pure directional focus resolution for Heroic menus (keyboard now, gamepad
 * in Task 11). Grid geometry only — no DOM, no Phaser.
 *
 * Semantics:
 * - move along row/column from the current node, skipping disabled nodes,
 * - stay on the current node when the edge is reached,
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
	let coordinate = vertical ? current.row : current.column;
	const fixed = vertical ? current.column : current.row;

	for (;;) {
		coordinate += step;
		const candidate = nodes.find((node) =>
			vertical
				? node.column === fixed && node.row === coordinate
				: node.row === fixed && node.column === coordinate
		);
		if (!candidate) return current.id;
		if (!candidate.disabled) return candidate.id;
	}
}
