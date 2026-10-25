import type {
	MapBackgroundPackageDefinition,
	ResolveMapBackgroundPackageInput
} from './map-background-package';
import { VILLAGE_INTERIOR_PACKAGES } from './village-interior-packages';

export const MAP_BACKGROUND_PACKAGE_REGISTRY: readonly MapBackgroundPackageDefinition[] =
	Object.freeze([...VILLAGE_INTERIOR_PACKAGES]);

export const MAP_BACKGROUND_DEFAULT_SELECTIONS: Readonly<
	Partial<Record<string, ResolveMapBackgroundPackageInput['defaultSelection']>>
> = Object.freeze({
	'hero-house': Object.freeze({
		packageId: 'hero-house-painted',
		mode: 'production' as const
	}),
	'guild-hall': Object.freeze({
		packageId: 'guild-hall-painted',
		mode: 'production' as const
	}),
	'item-shop': Object.freeze({
		packageId: 'item-shop-painted',
		mode: 'production' as const
	}),
	'blacksmith-interior': Object.freeze({
		packageId: 'blacksmith-interior-painted',
		mode: 'production' as const
	}),
	'villager-house-1': Object.freeze({
		packageId: 'villager-house-1-painted',
		mode: 'production' as const
	}),
	'villager-house-2': Object.freeze({
		packageId: 'villager-house-2-painted',
		mode: 'production' as const
	}),
	'villager-house-3': Object.freeze({
		packageId: 'villager-house-3-painted',
		mode: 'production' as const
	}),
	'shrine-of-aurora-interior': Object.freeze({
		packageId: 'shrine-of-aurora-interior-painted',
		mode: 'production' as const
	})
});
