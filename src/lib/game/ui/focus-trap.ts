/**
 * Shared Tab-key focus trap for aria-modal surfaces: keeps Tab/Shift+Tab
 * cycling among the container's visible focusable controls, and lands on the
 * container itself when it holds nothing focusable.
 */
export function trapTabFocus(
	event: KeyboardEvent,
	container: HTMLElement | undefined | null
): void {
	if (event.key !== 'Tab' || !container) return;

	const focusable = Array.from(
		container.querySelectorAll<HTMLElement>(
			'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
		)
	).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);

	if (focusable.length === 0) {
		event.preventDefault();
		container.focus();
		return;
	}

	const first = focusable[0]!;
	const last = focusable.at(-1)!;

	if (event.shiftKey && document.activeElement === first) {
		event.preventDefault();
		last.focus();
	} else if (!event.shiftKey && document.activeElement === last) {
		event.preventDefault();
		first.focus();
	}
}
