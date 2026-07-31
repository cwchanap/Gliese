export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]>;
};

type LeafPath<T, Prefix extends string = ''> = {
	[K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : LeafPath<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessagePath<T> = LeafPath<T>;
export type MessageParams = Record<string, string | number>;
