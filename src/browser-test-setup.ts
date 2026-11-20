// Browser specs render real components but never boot main.ts, and app.css
// only registers the @font-face rules — the woff2 fetch still starts lazily
// on first use. Without preloading, early measurements read fallback-metric
// text that differs between macOS and Linux runners (the HPA-840 layout
// assertions flake on exactly that). Register the faces and force the loads
// once per spec file so every test sees production font metrics.
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/500.css';
import '@fontsource/spectral/600.css';
import '@fontsource/zen-maru-gothic/500.css';
import '@fontsource/zen-maru-gothic/700.css';
import '@fontsource/zen-maru-gothic/900.css';

await Promise.all([
	document.fonts.load('400 16px Spectral'),
	document.fonts.load('500 16px Spectral'),
	document.fonts.load('600 16px Spectral'),
	document.fonts.load('500 16px "Zen Maru Gothic"'),
	document.fonts.load('700 16px "Zen Maru Gothic"'),
	document.fonts.load('900 16px "Zen Maru Gothic"')
]);
