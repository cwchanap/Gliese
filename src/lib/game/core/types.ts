export type Direction = 'up' | 'down' | 'left' | 'right';

export type DefinitionRegistry<TDefinition> = Record<string, TDefinition>;

export interface PlayerDefinition {
	id: string;
	baseHp: number;
	baseAttack: number;
	moveSpeed: number;
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
