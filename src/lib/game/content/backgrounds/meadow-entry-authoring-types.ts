export interface RawPixelBounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export type PixelBounds = RawPixelBounds;

export type WorldEdge = 'left' | 'right' | 'top' | 'bottom';

export interface Insets {
	top: number;
	right: number;
	bottom: number;
	left: number;
}
