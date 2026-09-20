const missing = new Set(['', 'null', 'undefined', 'false', '[object Object]']);
export function imageSource(value) {
  if (typeof value !== 'string') return '';
  const source = value.trim();
  if (missing.has(source.toLowerCase()) || /^(javascript|vbscript):/i.test(source)) return '';
  return source;
}

const artwork = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none">
<defs><linearGradient id="paper" x1="40" y1="0" x2="370" y2="300" gradientUnits="userSpaceOnUse"><stop stop-color="#FFF8F1"/><stop offset="1" stop-color="#F4E5DC"/></linearGradient><linearGradient id="brand" x1="145" y1="90" x2="250" y2="204" gradientUnits="userSpaceOnUse"><stop stop-color="#F7AC76"/><stop offset=".52" stop-color="#E8732A"/><stop offset="1" stop-color="#B84C23"/></linearGradient><linearGradient id="glass" x1="150" y1="83" x2="250" y2="207" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity=".95"/><stop offset="1" stop-color="white" stop-opacity=".4"/></linearGradient></defs>
<path fill="url(#paper)" d="M0 0h400v300H0z"/>
<circle cx="48" cy="17" r="142" stroke="#E2C7B7" stroke-opacity=".38"/><circle cx="380" cy="289" r="136" stroke="#E2C7B7" stroke-opacity=".38"/>
<path d="M-20 229c116-74 174 68 287 2s137-79 168-51" stroke="white" stroke-width="1.5" stroke-opacity=".7"/>
<rect x="139" y="86" width="122" height="122" rx="38" fill="#B9764B" fill-opacity=".06" transform="rotate(-8 200 147)"/>
<rect x="144" y="81" width="112" height="124" rx="36" fill="url(#glass)" stroke="white" stroke-width="1.5"/>
<path d="M176 111h23c16 0 26 7 26 20 0 8-4 13-10 16 9 3 14 10 14 19 0 15-11 23-29 23h-24v-78Zm15 14v17h7c8 0 12-3 12-9s-4-8-12-8h-7Zm0 30v20h9c9 0 14-3 14-10s-5-10-14-10h-9Z" fill="url(#brand)"/>
<path d="m248 64 3.2 8.8L260 76l-8.8 3.2L248 88l-3.2-8.8L236 76l8.8-3.2L248 64Z" fill="#D36E38"/>
<circle cx="133" cy="183" r="3" fill="#DBA27D"/><circle cx="277" cy="141" r="2" fill="#DBA27D"/>
</svg>`;
// Embedded vector: available offline, no external placeholder request or tracking.
export const IMAGE_PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(artwork);

export function isMissingImage({ src, srcSet, failed = false }) {
  return failed || (!imageSource(src) && !imageSource(srcSet));
}
