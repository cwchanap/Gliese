export interface MovementInputState {
	left: boolean;
	right: boolean;
	up: boolean;
	down: boolean;
}

export function resolveMovementVector(input: MovementInputState) {
	const x = Number(input.right) - Number(input.left);
	const y = Number(input.down) - Number(input.up);
	const length = Math.hypot(x, y) || 1;

	return { x: x / length, y: y / length };
}
