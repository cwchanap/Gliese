export const sundropVillageBackgroundsApproval = {
	approvedControlFingerprint: '8b3f80fdde4591465d90aca558ff747d3825939c5879fdadaf3c55e70cb3b4b2',
	base: {
		approvedPngSha256: 'f1184b045c27c544ac18937a4f8ccfa12cd386319b1722be5d808aea8048ade6',
		sizeBudgetException:
			'Tier 0 preserves the approved HPA-307 ground and aligned obstacle detail while remaining below the 8 MiB hard limit.',
		evidenceReport:
			'docs/superpowers/reports/2026-07-28-hpa-398-outdoor-baked-obstacle-validation.md'
	},
	foreground: {
		approvedPngSha256: '2d0a6703de1a404e49c0746f092a4c6f9f113ae17cd8bc35de635b5ec084ce45',
		sizeBudgetException: null,
		evidenceReport:
			'docs/superpowers/reports/2026-07-28-hpa-398-outdoor-baked-obstacle-validation.md'
	}
} as const;
