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

// Zen Maru Gothic ships as ~120 unicode-range faces, so fonts.load() only
// fetches the faces covering its sample text — the default ' ' loads just the
// space face and CJK specs still measure fallback metrics. The sample is the
// union of the CJK strings the specs render.
const cjkSample =
	'次へ閉じるミラモット爺グリクの家章の進行状況証明の朝の試練第一の試練：足跡藥水戦利品ポーション日本語已完成證明之晨的試煉';

await Promise.all([
	document.fonts.load('400 16px Spectral'),
	document.fonts.load('500 16px Spectral'),
	document.fonts.load('600 16px Spectral'),
	document.fonts.load('500 16px "Zen Maru Gothic"', cjkSample),
	document.fonts.load('700 16px "Zen Maru Gothic"', cjkSample),
	document.fonts.load('900 16px "Zen Maru Gothic"', cjkSample)
]);
