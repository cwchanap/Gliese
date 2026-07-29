export const sundropVillageBackgroundsApproval = {
	approvedControlFingerprint: '8b3f80fdde4591465d90aca558ff747d3825939c5879fdadaf3c55e70cb3b4b2',
	base: {
		approvedPngSha256: 'e94758cc3e689691748eaa3949b9781c330f4744ee29e4993f380230ca7ba245',
		sizeBudgetException:
			'Tier 0 preserves the approved HPA-307 ground and aligned obstacle detail while remaining below the 8 MiB hard limit.',
		evidenceReport:
			'docs/superpowers/reports/2026-07-28-hpa-398-outdoor-baked-obstacle-validation.md'
	},
	foreground: {
		approvedPngSha256: 'dd7469c1215885844231556283ac3d0848048540fad06502cd3af25dbb44cf41',
		sizeBudgetException: null,
		evidenceReport:
			'docs/superpowers/reports/2026-07-28-hpa-398-outdoor-baked-obstacle-validation.md'
	}
} as const;
