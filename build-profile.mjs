// Builds the static profile assets (hero, section headers, about, skills, social buttons/cards)
// into assets/*.svg from profile.config.json, then writes README.md around them.
// Any existing <!--SHOWCASE:START--> ... <!--SHOWCASE:END--> block in README.md is preserved
// (generate.mjs keeps that block up to date). Run:  node build-profile.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { extname } from 'node:path';

const P = JSON.parse(readFileSync('profile.config.json', 'utf8'));
const OUT = 'assets';
mkdirSync(OUT, { recursive: true });

// ---------- tokens ----------
const ROSE = '#f0a6c4', ROSE_DIM = '#d68aae', ROSE_SOFT = '#e8a8c4';
const TEXT = '#f7eef2', MUTED = '#b7a0ab';
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
const SERIF = "Georgia, 'Times New Roman', 'Liberation Serif', serif";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '…' : String(s));
function wrap(text, max, maxLines) {
  const lines = []; let cur = '';
  for (const w of String(text).split(/\s+/)) {
    if ((cur + ' ' + w).trim().length > max) { lines.push(cur); cur = w; } else { cur = (cur + ' ' + w).trim(); }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
  return lines;
}

const CSS = `
    .mono { font-family: ${MONO}; } .serif { font-family: ${SERIF}; } .sans { font-family: ${SANS}; }
    .card { animation: rise .9s ease-out both; }
    .run { animation: run 6s linear infinite; }
    .blink { animation: blink 2.4s ease-in-out infinite; }
    .cursor { animation: cur 1s steps(1) infinite; }
    .type { animation: type 1s steps(26, end) both; }
    @keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes run { from { stroke-dashoffset: 100; } to { stroke-dashoffset: -100; } }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: .25; } }
    @keyframes cur { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
    @keyframes type { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
    @keyframes ring { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(2); opacity: 0; } }
    @keyframes scan { from { transform: translateX(-80px); } to { transform: translateX(460px); } }
    @keyframes bars { 0%,100% { transform: scaleY(.45); } 50% { transform: scaleY(1); } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`;

function shell(w, h, label, body, { cx = 0.82, cy = 0.28, grid = true, gridX = 0.62, extraCss = '', extraDefs = '' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
  <defs>
    <radialGradient id="glow" cx="${cx}" cy="${cy}" r="0.62">
      <stop offset="0" stop-color="#6e1b3d" stop-opacity="0.9"/><stop offset="0.55" stop-color="#3a0f24" stop-opacity="0.45"/><stop offset="1" stop-color="#14070d" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${ROSE}" stop-opacity="0"/><stop offset="0.5" stop-color="${ROSE}"/><stop offset="1" stop-color="${ROSE}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${ROSE}" stop-opacity="0.9"/><stop offset="1" stop-color="${ROSE}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse">
      <path d="M22 0H0V22" fill="none" stroke="${ROSE}" stroke-opacity="0.07" stroke-width="1"/>
    </pattern>
    <clipPath id="clip"><rect width="${w}" height="${h}" rx="18"/></clipPath>${extraDefs}
  </defs>
  <style>${CSS}${extraCss}
  </style>
  <g class="card" clip-path="url(#clip)">
    <rect width="${w}" height="${h}" rx="18" fill="#14070d"/>
    <rect width="${w}" height="${h}" fill="url(#glow)"/>
    ${grid ? `<rect x="${w * gridX}" width="${w * (1 - gridX)}" height="${h}" fill="url(#grid)"/>` : ''}
    <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="18" fill="none" stroke="#5a2339"/>
    <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="18" fill="none" stroke="url(#edge)" stroke-width="2" pathLength="100" stroke-dasharray="22 78" class="run"/>
    ${body}
  </g>
</svg>
`;
}

const save = (name, svg) => writeFileSync(`${OUT}/${name}.svg`, svg);

// ---------- original hero character: a floating, cross-legged meditator ----------
function characterArt(cx, cy) {
  const SCALE = 1.35;
  const defs = `
    <radialGradient id="chAura" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${ROSE}" stop-opacity="0.42"/><stop offset="0.55" stop-color="#b8476f" stop-opacity="0.18"/><stop offset="1" stop-color="#b8476f" stop-opacity="0"/></radialGradient>
    <radialGradient id="chHaloFill" cx="0.5" cy="0.5" r="0.5"><stop offset="0.55" stop-color="#f6c9da" stop-opacity="0"/><stop offset="1" stop-color="#f6c9da" stop-opacity="0.22"/></radialGradient>
    <linearGradient id="chRobe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8426d"/><stop offset="1" stop-color="#5a1d3a"/></linearGradient>
    <linearGradient id="chSleeve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e3560"/><stop offset="1" stop-color="#4a1630"/></linearGradient>
    <linearGradient id="chLap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b2548"/><stop offset="1" stop-color="#2e0f21"/></linearGradient>
    <linearGradient id="chSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7d3b8"/><stop offset="1" stop-color="#e5a98a"/></linearGradient>
    <radialGradient id="chCloud" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#f6dbe8" stop-opacity="0.22"/><stop offset="1" stop-color="#f6dbe8" stop-opacity="0"/></radialGradient>`;
  const css = `
    .float { animation: bob 5s ease-in-out infinite; }
    .shd { transform-box: fill-box; transform-origin: center; animation: shd 5s ease-in-out infinite; }
    .breathe { transform-box: fill-box; transform-origin: 50% 100%; animation: breathe 4s ease-in-out infinite; }
    .drift { animation: drift 9s ease-in-out infinite; }
    .twinkle { animation: blink 2.8s ease-in-out infinite; }
    @keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
    @keyframes shd { 0%,100% { transform: scaleX(1); opacity: .42; } 50% { transform: scaleX(.78); opacity: .24; } }
    @keyframes breathe { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.025); } }
    @keyframes drift { 0%,100% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }`;

  const wisp = (x, y, rx, ry, dur, begin) =>
    `<g><circle cx="${x}" cy="${y}" r="8" fill="${ROSE}" opacity=".22"/><circle cx="${x}" cy="${y}" r="2.6" fill="#fff"/>
     <animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="M0 0 a${rx} ${ry} 0 1 1 ${(x < 0 ? 2 : -2) * rx} 0 a${rx} ${ry} 0 1 1 ${(x < 0 ? -2 : 2) * rx} 0"/></g>`;
  const spark = (x, y, d) =>
    `<path d="M${x} ${y - 5} V${y + 5} M${x - 5} ${y} H${x + 5}" stroke="#fbdce8" stroke-width="1.2" stroke-linecap="round" class="twinkle" style="animation-delay:${d}s"/>`;

  const markup = `
    <g transform="translate(${cx} ${cy + 22}) scale(${SCALE})">
      <circle cx="0" cy="-26" r="104" fill="url(#chAura)"/>
      <circle cx="0" cy="-58" r="46" fill="url(#chHaloFill)" stroke="#f0c9d8" stroke-opacity=".6" stroke-width="1.2"/>
      <circle cx="0" cy="-58" r="55" fill="none" stroke="${ROSE}" stroke-opacity=".45" stroke-dasharray="2 6">
        <animateTransform attributeName="transform" type="rotate" from="0 0 -58" to="360 0 -58" dur="40s" repeatCount="indefinite"/>
      </circle>
      <g class="drift">
        <ellipse cx="-34" cy="74" rx="52" ry="9" fill="url(#chCloud)"/>
        <ellipse cx="40" cy="80" rx="60" ry="10" fill="url(#chCloud)"/>
      </g>
      <ellipse cx="0" cy="82" rx="46" ry="6" fill="#000" class="shd"/>

      <g class="float">
        <path d="M -68 40 C -70 20 -34 8 0 8 C 34 8 70 20 68 40 C 66 52 36 56 0 56 C -36 56 -66 52 -68 40 Z" fill="url(#chLap)"/>
        <path d="M -52 38 C -32 28 -12 36 0 30 M 52 38 C 32 28 12 36 0 30" fill="none" stroke="${ROSE}" stroke-opacity=".28"/>
        <ellipse cx="-20" cy="50" rx="13" ry="6.5" fill="url(#chSkin)" transform="rotate(-8 -20 50)"/>
        <ellipse cx="20" cy="50" rx="13" ry="6.5" fill="url(#chSkin)" transform="rotate(8 20 50)"/>

        <g class="breathe">
          <path d="M -28 -30 C -34 -10 -30 8 -24 14 L 24 14 C 30 8 34 -10 28 -30 C 14 -36 -14 -36 -28 -30 Z" fill="url(#chRobe)"/>
          <path d="M -12 -34 L 0 -14 L 12 -34" fill="none" stroke="#f3d9c8" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>
          <rect x="-26" y="8" width="52" height="7" rx="3.5" fill="#f3d9c8" opacity=".92"/>
          <circle cx="9" cy="11.5" r="4" fill="${ROSE}"/>
          <path d="M 7 15 C 9 24 5 30 9 38 M 11 15 C 15 22 14 30 18 36" fill="none" stroke="#f3d9c8" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>
        </g>

        <path d="M -26 -28 C -45 -20 -57 4 -54 34 C -52 40 -43 42 -39 36 C -41 16 -34 0 -22 -8 Z" fill="url(#chSleeve)"/>
        <path d="M 26 -28 C 45 -20 57 4 54 34 C 52 40 43 42 39 36 C 41 16 34 0 22 -8 Z" fill="url(#chSleeve)"/>
        <circle cx="-47" cy="38" r="6.2" fill="url(#chSkin)"/><circle cx="-47" cy="38" r="2.6" fill="none" stroke="#c98a6c" stroke-width=".9"/>
        <circle cx="47" cy="38" r="6.2" fill="url(#chSkin)"/><circle cx="47" cy="38" r="2.6" fill="none" stroke="#c98a6c" stroke-width=".9"/>

        <rect x="-5.5" y="-42" width="11" height="12" fill="#d9987a"/>
        <ellipse cx="-21" cy="-56" rx="3.6" ry="5.2" fill="#e5a98a"/><ellipse cx="21" cy="-56" rx="3.6" ry="5.2" fill="#e5a98a"/>
        <circle cx="0" cy="-58" r="21" fill="url(#chSkin)"/>
        <circle cx="-12.5" cy="-47" r="4" fill="#f08fa8" opacity=".35"/><circle cx="12.5" cy="-47" r="4" fill="#f08fa8" opacity=".35"/>
        <path d="M -12 -56 q 4.5 4.5 9 0 M 3 -56 q 4.5 4.5 9 0" fill="none" stroke="#3a1428" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M -13 -62 q 5 -3 10 -1 M 3 -63 q 5 -2 10 1" fill="none" stroke="#2b1220" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M 0 -54 q 1.6 4 -1 5" fill="none" stroke="#c98a6c" stroke-width=".9" stroke-linecap="round"/>
        <path d="M -4 -44 q 4 3.5 8 0" fill="none" stroke="#a2455f" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M -23 -54 C -27 -96 27 -96 23 -54 C 20 -61 13 -67 3 -66 C -7 -65 -16 -62 -23 -54 Z" fill="#2b1220"/>
        <path d="M -11 -80 C -3 -85 8 -83 13 -76" fill="none" stroke="#7a3a5c" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>
        <path d="M 1 -83 C -2 -93 7 -98 14 -95 C 12 -87 8 -83 1 -83 Z" fill="${ROSE}"/>
        <circle cx="0" cy="-60.5" r="1.9" fill="#f7b6cd"/><circle cx="0" cy="-60.5" r="4.5" fill="#f7b6cd" opacity=".25"/>

        <path d="M -17 -37 C -8 -30 8 -30 17 -37 L 19 -31 C 8 -22 -8 -22 -19 -31 Z" fill="#f6dbe8"/>
        <path d="M 16 -31 C 28 -46 42 -36 52 -54" fill="none" stroke="#f3cfdd" stroke-width="5.5" stroke-linecap="round">
          <animate attributeName="d" dur="3.2s" repeatCount="indefinite" values="M16 -31 C28 -46 42 -36 52 -54; M16 -31 C30 -40 40 -48 56 -46; M16 -31 C28 -46 42 -36 52 -54"/>
        </path>
        <path d="M -16 -31 C -27 -44 -38 -36 -47 -50" fill="none" stroke="#e9b8cd" stroke-width="5" stroke-linecap="round">
          <animate attributeName="d" dur="3.8s" repeatCount="indefinite" values="M-16 -31 C-27 -44 -38 -36 -47 -50; M-16 -31 C-28 -38 -36 -46 -50 -44; M-16 -31 C-27 -44 -38 -36 -47 -50"/>
        </path>
      </g>

      ${wisp(92, -20, 92, 34, 16, 0)}${wisp(-80, -52, 80, 30, 21, -7)}
      ${spark(-78, -88, 0)}${spark(84, -78, 0.9)}${spark(-92, 6, 1.7)}${spark(72, 46, 2.3)}
    </g>`;
  return { defs, css, markup };
}

// ---------- hero ----------
function hero() {
  const W = 1000, H = 440, cx = 790, cy = 205;
  const pw = Math.ceil((P.prompt.path.length + P.prompt.cmd.length + 3) * 7.2 + 52);

  const angles = [-65, -5, 40, 140, 210];
  const orbit = P.orbit.slice(0, 5).map((label, i) => {
    const a = (angles[i] * Math.PI) / 180;
    const x = cx + 140 * Math.cos(a), y = cy + 140 * Math.sin(a);
    const right = Math.cos(a) >= 0;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${ROSE}" class="blink" style="animation-delay:${i * 0.4}s"/>
    <text x="${(x + (right ? 10 : -10)).toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="${right ? 'start' : 'end'}" class="mono orb">${esc(label)}</text>`;
  }).join('');

  const orbitDot = (r, dur, begin) =>
    `<circle cx="${cx + r}" cy="${cy}" r="3" fill="#fff"><animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="M0 0 A${r} ${r} 0 1 1 ${-2 * r} 0 A${r} ${r} 0 1 1 0 0"/></circle>`;

  const initials = `${P.first[0]}${P.last[0]}`.toUpperCase();
  let inner = `<text x="${cx}" y="${cy + 28}" text-anchor="middle" class="serif mono-ini">${esc(initials)}</text>`;
  let photoDefs = '';
  if (P.photo && existsSync(P.photo)) {
    const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[extname(P.photo).toLowerCase()] || 'image/jpeg';
    const b64 = readFileSync(P.photo).toString('base64');
    photoDefs = `<clipPath id="arch"><path d="M715 305 V180 A75 75 0 0 1 865 180 V305 Z"/></clipPath>
    <linearGradient id="archbase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbdce8"/><stop offset="0.55" stop-color="#e3a9c4"/><stop offset="1" stop-color="#8a3358"/></linearGradient>
    <linearGradient id="archfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.62" stop-color="#14070d" stop-opacity="0"/><stop offset="1" stop-color="#14070d" stop-opacity="0.9"/></linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${ROSE}" stop-opacity="0.38"/><stop offset="0.6" stop-color="#b8476f" stop-opacity="0.16"/><stop offset="1" stop-color="#b8476f" stop-opacity="0"/></radialGradient>`;
    inner = `<g clip-path="url(#arch)">
      <rect x="715" y="105" width="150" height="200" fill="url(#archbase)"/>
      <image href="data:${mime};base64,${b64}" x="715" y="105" width="150" height="200" preserveAspectRatio="xMidYMid slice" style="mix-blend-mode:multiply;filter:brightness(1.28) contrast(1.04) saturate(1.0)"/>
      <rect x="715" y="105" width="150" height="200" fill="url(#archfade)"/>
    </g>
    <path d="M715 305 V180 A75 75 0 0 1 865 180 V305 Z" fill="none" stroke="#f0c9d8" stroke-opacity=".55" stroke-width="1.2"/>
    <path d="M879 150 V318 H702 M879 150" fill="none" stroke="#d9bd9c" stroke-opacity=".6" stroke-width="1"/>`;
  }

  const CH = P.portrait === 'character' ? characterArt(cx, cy) : null;
  const body = `
    <rect x="48" y="40" width="${pw}" height="34" rx="17" class="pillbox"/>
    <circle cx="68" cy="57" r="4" fill="${ROSE}"/>
    <text x="82" y="61.5" class="mono pr">${esc(P.prompt.path)} <tspan fill="${ROSE}">$</tspan> <tspan class="prc">${esc(P.prompt.cmd)}</tspan></text>

    <line x1="48" y1="122" x2="82" y2="122" stroke="${ROSE_DIM}" stroke-opacity=".6"/>
    <text x="94" y="126" class="mono eyebrow">${esc(P.eyebrow)}</text>

    <text x="46" y="204" class="serif nm">${esc(P.first)}</text>
    <text x="46" y="294" class="serif nm it" fill="url(#nameg)">${esc(P.last)}<tspan fill="${ROSE}">.</tspan></text>
    <rect x="48" y="310" width="520" height="2" fill="url(#fade)"/>

    <text x="48" y="346" class="mono hd">${esc(clip(P.headline, 56))}</text>
    <text x="48" y="380" class="serif tg">${esc(clip(P.tagline, 62))}</text>

    <circle cx="${cx}" cy="${cy}" r="105" class="rg"/>
    <circle cx="${cx}" cy="${cy}" r="140" class="rg d"/>
    <circle cx="${cx}" cy="${cy}" r="75" class="ringp"/>
    ${orbit}
    ${orbitDot(105, 14, 0)}${orbitDot(140, 22, -6)}
    ${CH ? CH.markup : `${P.photo && existsSync(P.photo) ? `<circle cx="${cx}" cy="${cy}" r="150" fill="url(#halo)"/>` : ''}
    <path d="M715 305 V180 A75 75 0 0 1 865 180 V305 Z" fill="url(#archg)" stroke="${ROSE}" stroke-opacity=".55"/>
    ${inner}`}

    <line x1="48" y1="398" x2="952" y2="398" stroke="${ROSE}" stroke-opacity=".2"/>
    <text x="48" y="424" class="mono ft">${esc(clip(P.footerLeft, 56))}</text>
    <text x="952" y="424" text-anchor="end" class="mono ft">${esc(clip(P.footerRight, 60))}</text>`;

  const css = `
    .pillbox { fill: #1d0a13; stroke: #5a2339; }
    .pr { font-size: 12px; fill: ${MUTED}; } .prc { fill: ${TEXT}; font-weight: 700; }
    .eyebrow { font-size: 12px; letter-spacing: .26em; fill: ${ROSE_DIM}; }
    .nm { font-size: 88px; fill: ${TEXT}; } .nm.it { font-style: italic; }
    .hd { font-size: 12.5px; letter-spacing: .16em; fill: ${TEXT}; font-weight: 700; }
    .tg { font-size: 20px; font-style: italic; fill: ${MUTED}; }
    .ft { font-size: 10.5px; letter-spacing: .14em; fill: #8d6f7c; }
    .rg { fill: none; stroke: ${ROSE}; stroke-opacity: .22; stroke-width: 1; } .rg.d { stroke-dasharray: 3 6; }
    .ringp { fill: none; stroke: ${ROSE}; stroke-width: 1.2; transform-box: fill-box; transform-origin: center; animation: ring 3.6s ease-out infinite; }
    .orb { font-size: 10px; letter-spacing: .2em; fill: ${ROSE_DIM}; }
    .mono-ini { font-size: 58px; fill: ${TEXT}; text-anchor: middle; }${CH ? CH.css : ''}`;
  const defs = `
    <linearGradient id="nameg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6dbe8"/><stop offset="1" stop-color="#d98bb0"/></linearGradient>
    <linearGradient id="archg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a1d3a"/><stop offset="1" stop-color="#1c0a14"/></linearGradient>${photoDefs}${CH ? CH.defs : ''}`;
  save('hero', shell(W, H, `${P.first} ${P.last} — ${P.title}`, body, { extraCss: css, extraDefs: defs, gridX: 0.6 }));
}

// ---------- section headers ----------
function header(file, n, label, parts, right) {
  const W = 1000, H = 96;
  const title = parts.map(([t, it]) => it ? `<tspan class="hi">${esc(t)}</tspan>` : esc(t)).join('');
  const body = `
    <text x="48" y="30" class="mono sn"><tspan class="snn">${n}</tspan> ${esc(label)}</text>
    <text x="952" y="30" text-anchor="end" class="mono sr">${esc(right)}</text>
    <text x="48" y="70" class="serif ht">${title}</text>
    <rect x="48" y="83" width="904" height="1" fill="url(#fade)"/>
    <circle cx="48" cy="83.5" r="3" fill="${ROSE}"><animateMotion dur="7s" repeatCount="indefinite" path="M0 0 H880"/></circle>`;
  const css = `
    .sn { font-size: 11px; letter-spacing: .22em; fill: ${ROSE_DIM}; } .snn { fill: ${ROSE}; font-weight: 700; }
    .sr { font-size: 10px; letter-spacing: .22em; fill: #8d6f7c; }
    .ht { font-size: 38px; fill: ${TEXT}; } .hi { font-style: italic; fill: ${ROSE_SOFT}; }`;
  save(file, shell(W, H, parts.map(p => p[0]).join(''), body, { extraCss: css, grid: false, cx: 0.9, cy: 0.2 }));
}

// ---------- about (terminal + stat tiles) ----------
function about() {
  const W = 1000, H = 336;
  const lines = P.terminal.slice(0, 4).map((l, i) => {
    const y = 104 + i * 52;
    const last = i === P.terminal.length - 1 || i === 3;
    return `<g class="type" style="animation-delay:${(0.6 + i * 1.3).toFixed(1)}s">
      <text x="72" y="${y}" class="mono tcmd"><tspan fill="${ROSE}">$</tspan> ${esc(l.cmd)}</text>
      <text x="72" y="${y + 21}" class="mono tout">${esc(clip(l.out, 66))}${last ? '<tspan class="cursor" fill="' + ROSE + '"> ▍</tspan>' : ''}</text></g>`;
  }).join('');
  const tiles = P.stats.slice(0, 3).map((s, i) => {
    const y = 36 + i * 92;
    return `<g><rect x="664" y="${y}" width="288" height="80" rx="12" class="tile"/>
      <rect x="664" y="${y + 12}" width="3" height="56" rx="1.5" fill="${ROSE}"/>
      <text x="686" y="${y + 24}" class="mono tl">${esc(s.label)}</text>
      <text x="686" y="${y + 54}" class="serif tv">${esc(s.value)}</text>
      <text x="686" y="${y + 70}" class="mono ts">${esc(clip(s.sub, 42))}</text></g>`;
  }).join('');
  const body = `
    <rect x="48" y="36" width="592" height="264" rx="12" class="term"/>
    <path d="M48 48 a12 12 0 0 1 12 -12 H628 a12 12 0 0 1 12 12 V68 H48 Z" fill="#1d0a13"/>
    <circle cx="68" cy="52" r="5" fill="#a2315f"/><circle cx="88" cy="52" r="5" fill="#5a2339"/><circle cx="108" cy="52" r="5" fill="#5a2339"/>
    <text x="344" y="56" text-anchor="middle" class="mono tt">${esc(P.first.toLowerCase())}@portfolio: ~</text>
    ${lines}${tiles}`;
  const css = `
    .term { fill: #0f0509; stroke: #5a2339; }
    .tt { font-size: 11px; fill: #8d6f7c; }
    .tcmd { font-size: 13.5px; fill: ${TEXT}; font-weight: 700; } .tout { font-size: 13px; fill: ${MUTED}; }
    .tile { fill: #1d0a13; stroke: #4a1c30; }
    .tl { font-size: 10px; letter-spacing: .2em; fill: ${ROSE_DIM}; }
    .tv { font-size: 30px; fill: ${TEXT}; } .ts { font-size: 10px; fill: ${MUTED}; }`;
  save('about', shell(W, H, 'About', body, { extraCss: css, gridX: 0.65 }));
}

// ---------- expertise (leadership + AI craft + industries) ----------
function expertise() {
  const W = 1000, H = 380;
  const lead = P.leadership.slice(0, 2).map((t, i) => {
    const y = 70 + i * 104;
    const bars = [0, 1, 2, 3].map(k =>
      `<rect x="${430 + k * 9}" y="${y + 30}" width="5" height="32" rx="2.5" fill="${ROSE}" opacity=".55" class="bar" style="animation-delay:${(k * 0.25 + i * 0.4).toFixed(2)}s"/>`).join('');
    return `<g><rect x="48" y="${y}" width="422" height="92" rx="14" class="tile"/>
      <text x="68" y="${y + 62}" class="serif big">0${i + 1}</text>
      <text x="136" y="${y + 38}" class="mono tl">${i === 0 ? 'STRATEGY' : 'LEADERSHIP'}</text>
      <text x="136" y="${y + 66}" class="serif lt">${esc(clip(t, 26))}</text>
      ${bars}</g>`;
  }).join('');

  let px = 48;
  const inds = P.industries.map(t => {
    const w = Math.ceil(t.length * 7.4 + 28);
    const out = `<rect x="${px}" y="318" width="${w}" height="30" rx="15" class="pill"/><text x="${px + w / 2}" y="337" text-anchor="middle" class="mono pt">${esc(t)}</text>`;
    px += w + 8;
    return out;
  }).join('');

  const craft = P.craft.slice(0, 6).map((t, i) => {
    const x = 520 + (i % 2) * 224, y = 70 + Math.floor(i / 2) * 96;
    return `<g><rect x="${x}" y="${y}" width="212" height="84" rx="12" class="tile"/>
      <text x="${x + 16}" y="${y + 24}" class="mono tl">0${i + 1}</text>
      <circle cx="${x + 194}" cy="${y + 20}" r="3.5" fill="${ROSE}" class="blink" style="animation-delay:${(i * 0.45).toFixed(2)}s"/>
      ${wrap(t, 23, 2).map((l, k) => `<text x="${x + 16}" y="${y + 50 + k * 19}" class="sans ct">${esc(l)}</text>`).join('')}</g>`;
  }).join('');

  const body = `
    <text x="48" y="52" class="mono lab">LEADERSHIP</text>
    <text x="520" y="52" class="mono lab">AI CRAFT</text>
    <text x="48" y="304" class="mono lab">INDUSTRIES</text>
    ${lead}${inds}${craft}
    <clipPath id="grid-clip"><rect x="520" y="70" width="436" height="276"/></clipPath>
    <g clip-path="url(#grid-clip)"><rect x="520" y="70" width="80" height="276" fill="url(#scanc)" class="scanr"/></g>`;
  const css = `
    .lab { font-size: 11px; letter-spacing: .24em; fill: ${ROSE_DIM}; }
    .tile { fill: #1d0a13; stroke: #4a1c30; }
    .tl { font-size: 10px; letter-spacing: .2em; fill: ${ROSE_DIM}; }
    .big { font-size: 46px; fill: none; stroke: ${ROSE}; stroke-opacity: .75; stroke-width: 1; }
    .lt { font-size: 21px; fill: ${TEXT}; }
    .ct { font-size: 15px; fill: ${TEXT}; }
    .pill { fill: #2a1019; stroke: #6b2a44; } .pt { font-size: 12px; fill: #e9b8cd; }
    .bar { transform-box: fill-box; transform-origin: bottom; animation: bars 2.6s ease-in-out infinite; }
    .scanr { animation: scan 6s linear infinite; }`;
  const defs = `<linearGradient id="scanc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${ROSE}" stop-opacity="0"/><stop offset="1" stop-color="${ROSE}" stop-opacity=".14"/></linearGradient>`;
  save('expertise', shell(W, H, 'Expertise', body, { extraCss: css, extraDefs: defs, gridX: 0.5 }));
}

// ---------- social buttons + cards ----------
const iconIn = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect width="22" height="22" rx="4" fill="#fff"/><text x="11" y="17" text-anchor="middle" class="sans" font-size="15" font-weight="800" fill="#0d0508">in</text></g>`;
const iconMail = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="1" y="3" width="22" height="16" rx="2.5" fill="none" stroke="#fff" stroke-width="2"/><path d="M2 5 L12 13 L22 5" fill="none" stroke="#fff" stroke-width="2"/></g>`;

function button(file, icon, label, value) {
  const H = 40;
  const lw = Math.ceil(16 + 24 + 10 + label.length * 9.6 + 18);
  const rw = Math.ceil(value.length * 10.4 + 36);
  const W = lw + rw;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}: ${esc(value)}">
  <style>.sans{font-family:${SANS}} .l{font-size:14px;letter-spacing:.08em;fill:#fff} .v{font-size:13px;font-weight:800;letter-spacing:.07em;fill:#fff}</style>
  <rect width="${lw}" height="${H}" fill="#0d0508"/><rect x="${lw}" width="${rw}" height="${H}" fill="#7a1d44"/>
  ${icon(16, 9)}
  <text x="${16 + 24 + 10}" y="25.5" class="sans l">${esc(label)}</text>
  <text x="${lw + rw / 2}" y="25.5" text-anchor="middle" class="sans v">${esc(value.toUpperCase())}</text>
</svg>
`;
  save(file, svg);
}

function linkCard(file, iconFn, label, value, cta) {
  const W = 490, H = 130;
  const body = `
    <rect x="28" y="37" width="56" height="56" rx="14" fill="#2a1019" stroke="${ROSE}" stroke-opacity=".6"/>
    <g transform="translate(40 49) scale(1.17)">${iconFn === 'in'
      ? `<rect width="22" height="22" rx="4" fill="${ROSE}"/><text x="11" y="17" text-anchor="middle" class="sans" font-size="15" font-weight="800" fill="#14070d">in</text>`
      : `<rect x="1" y="3" width="22" height="16" rx="2.5" fill="none" stroke="${ROSE}" stroke-width="2"/><path d="M2 5 L12 13 L22 5" fill="none" stroke="${ROSE}" stroke-width="2"/>`}</g>
    <text x="108" y="48" class="mono tl">${esc(label)}</text>
    <text x="108" y="80" class="serif cv">${esc(clip(value, 28))}</text>
    <text x="108" y="106" class="mono cta">${esc(cta)} →</text>`;
  const css = `
    .tl { font-size: 10.5px; letter-spacing: .22em; fill: ${ROSE_DIM}; }
    .cv { font-size: 24px; fill: ${TEXT}; } .cta { font-size: 11px; letter-spacing: .16em; fill: ${ROSE}; }`;
  save(file, shell(W, H, `${label}: ${value}`, body, { extraCss: css, gridX: 0.7 }));
}

// ---------- README ----------
function readme() {
  let block = '<!--SHOWCASE:START-->\n<!--SHOWCASE:END-->';
  if (existsSync('README.md')) {
    const m = readFileSync('README.md', 'utf8').match(/<!--SHOWCASE:START-->[\s\S]*?<!--SHOWCASE:END-->/);
    if (m) block = m[0];
  }
  const img = (f, alt, extra = 'width="100%"') => `<img src="assets/${f}.svg" alt="${esc(alt)}" ${extra}>`;
  const md = `<div align="center">

${img('hero', `${P.first} ${P.last} — ${P.title}`)}

<a href="${P.linkedin}">${img('btn-linkedin', 'LinkedIn', '')}</a>
<a href="mailto:${P.email}">${img('btn-email', 'Email', '')}</a>

${img('sec-about', 'About')}

${img('about', 'About me')}

${img('sec-expertise', 'Expertise')}

${img('expertise', 'Expertise')}

${img('sec-work', 'Selected work')}

${block}

${img('sec-connect', 'Connect')}

<a href="${P.linkedin}">${img('card-linkedin', 'LinkedIn', 'width="49%"')}</a>
<a href="mailto:${P.email}">${img('card-email', 'Email', 'width="49%"')}</a>

</div>
`;
  writeFileSync('README.md', md);
}

hero();
header('sec-about', '01', 'ABOUT', [["Hello, I'm ", false], [P.first, true], ['.', false]], 'WHO I AM');
header('sec-expertise', '02', 'EXPERTISE', [['What I ', false], ['lead & build', true], ['.', false]], 'STRATEGY · AI CRAFT · INDUSTRIES');
header('sec-work', '03', 'SELECTED WORK', [['Things I’ve ', false], ['built', true], ['.', false]], 'LATEST REPOSITORIES · AUTO-UPDATED');
header('sec-connect', '04', 'CONNECT', [['Let’s ', false], ['talk', true], ['.', false]], 'FIND ME ONLINE');
about();
expertise();
button('btn-linkedin', iconIn, 'LINKEDIN', P.linkedinHandle);
button('btn-email', iconMail, 'EMAIL', P.email);
linkCard('card-linkedin', 'in', 'LINKEDIN', `in/${P.linkedinHandle}`, 'VIEW PROFILE');
linkCard('card-email', 'mail', 'EMAIL', P.email, 'SEND A MESSAGE');
readme();
console.log('Wrote assets/*.svg and README.md');
