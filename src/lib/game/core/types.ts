export type Direction = 'up' | 'down' | 'left' | 'right';

export interface PlayerDefinition {
	id: string;
	baseHp: number;
	baseAttack: number;
	moveSpeed: number;
	facing: Direction;
}

export interface EnemyDefinition {
	id: string;
	baseHp: number;
	baseAttack: number;
	moveSpeed: number;
}

export interface MapDefinition {
	id: string;
	width: number;
	height: number;
	spawnDirection: Direction;
}
