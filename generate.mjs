// Generates animated repo-showcase SVGs (dark + light) for a GitHub profile README.
// Usage:  node generate.mjs            (fetches live data from the GitHub API)
//         node generate.mjs --sample   (uses built-in sample data, for local preview)
//
// Env: GH_USER (default RohanKhollamkar), REPO_COUNT (default 2),
//      EXCLUDE (comma-separated repo names to skip), GITHUB_TOKEN (optional, raises rate limit)

import { writeFileSync } from 'node:fs';

const USER = process.env.GH_USER || 'RohanKhollamkar';
const COUNT = Number(process.env.REPO_COUNT || 2);
const EXCLUDE = (process.env.EXCLUDE || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const TOKEN = process.env.GITHUB_TOKEN;
const SAMPLE = process.argv.includes('--sample');

const LANG_COLORS = {
  Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26',
  CSS: '#563d7c', Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', Shell: '#89e051',
  'Jupyter Notebook': '#DA5B0B', C: '#555555', 'C++': '#f34b7d', Ruby: '#701516',
};

const SAMPLE_REPOS = [
  { name: 'mcp-trust-fabric', description: 'A trust layer for MCP servers so AI agents can verify the tools they call before using them.', language: 'TypeScript', stargazers_count: 12, forks_count: 3, pushed_at: '2026-11-08T10:00:00Z' },
  { name: 'director-agent', description: 'Async, orchestration-based storyboard generator that coordinates multiple agents into one video plan.', language: 'Python', stargazers_count: 7, forks_count: 1, pushed_at: '2026-11-02T10:00:00Z' },
];

async function fetchRepos() {
  if (SAMPLE) return SAMPLE_REPOS.slice(0, COUNT);
  const url = `https://api.github.com/users/${USER}/repos?sort=pushed&direction=desc&per_page=50&type=owner`;
  const headers = { 'User-Agent': 'repo-showcase', Accept: 'application/vnd.github+json' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const all = await res.json();
  return all
    .filter(r => !r.fork && !r.archived && !r.private)
    .filter(r => r.name.toLowerCase() !== USER.toLowerCase()) // skip the profile repo itself
    .filter(r => !EXCLUDE.includes(r.name.toLowerCase()))
    .slice(0, COUNT);
}

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function wrap(text, max, maxLines) {
  const words = String(text || 'No description yet.').split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) { lines.push(cur); cur = w; } else { cur = (cur + ' ' + w).trim(); }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}

const fmtDate = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const THEMES = {
  dark:  { bg: '#0d1117', card: '#161b22', border: '#30363d', text: '#e6edf3', muted: '#8b949e', a1: '#58a6ff', a2: '#bc8cff' },
  light: { bg: '#ffffff', card: '#f6f8fa', border: '#d0d7de', text: '#1f2328', muted: '#656d76', a1: '#0969da', a2: '#8250df' },
};

function render(repos, t) {
  const W = 900, pad = 20, gap = 20, headerH = 64, cardH = 172;
  const n = Math.max(repos.length, 1);
  const cardW = (W - pad * 2 - gap * (n - 1)) / n;
  const H = headerH + cardH + pad + 8;
  const descMax = Math.floor((cardW - 48) / 7.1);

  const cards = repos.map((r, i) => {
    const x = pad + i * (cardW + gap);
    const y = headerH;
    const lines = wrap(r.description, descMax, 3);
    const lang = r.language;
    const dot = LANG_COLORS[lang] || t.muted;
    const delay = (0.25 + i * 0.25).toFixed(2);
    const desc = lines.map((l, k) => `<text x="24" y="${78 + k * 20}" class="desc">${esc(l)}</text>`).join('');
    const metaY = cardH - 22;
    let mx = 24;
    let meta = '';
    if (lang) {
      meta += `<circle cx="${mx + 5}" cy="${metaY - 4}" r="5" fill="${dot}"/><text x="${mx + 16}" y="${metaY}" class="meta">${esc(lang)}</text>`;
      mx += 28 + lang.length * 7;
    }
    meta += `<text x="${mx}" y="${metaY}" class="meta">★ ${r.stargazers_count}</text>`;
    mx += 46;
    meta += `<text x="${mx}" y="${metaY}" class="meta">⑂ ${r.forks_count}</text>`;
    meta += `<text x="${cardW - 24}" y="${metaY}" class="meta" text-anchor="end">Updated ${fmtDate(r.pushed_at)}</text>`;

    return `
  <g transform="translate(${x} ${y})">
    <g class="card" style="animation-delay:${delay}s">
      <rect width="${cardW}" height="${cardH}" rx="12" fill="${t.card}" stroke="${t.border}"/>
      <rect class="run" width="${cardW}" height="${cardH}" rx="12" fill="none" stroke="url(#g)" stroke-width="2" pathLength="100" stroke-dasharray="14 86" style="animation-delay:${delay}s"/>
      <circle class="pulse" cx="28" cy="34" r="4" fill="${t.a1}"/>
      <text x="44" y="39" class="title">${esc(r.name)}</text>
      ${desc}
      ${meta}
    </g>
  </g>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Latest repositories">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.a1}"/><stop offset="1" stop-color="${t.a2}"/>
    </linearGradient>
  </defs>
  <style>
    text { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; }
    .head { font-size: 22px; font-weight: 700; fill: ${t.text}; }
    .sub { font-size: 13px; fill: ${t.muted}; }
    .title { font-size: 17px; font-weight: 600; fill: ${t.a1}; }
    .desc { font-size: 13px; fill: ${t.text}; }
    .meta { font-size: 12px; fill: ${t.muted}; }
    .card { opacity: 0; animation: rise 0.6s ease-out forwards; }
    .run { animation: run 4s linear infinite; }
    .pulse { animation: pulse 2s ease-in-out infinite; }
    .fade { opacity: 0; animation: fade 0.6s ease-out forwards; }
    @keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fade { to { opacity: 1; } }
    @keyframes run { to { stroke-dashoffset: -100; } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
    @media (prefers-reduced-motion: reduce) {
      .card, .fade { animation: none; opacity: 1; }
      .run, .pulse { animation: none; }
    }
  </style>
  <rect width="${W}" height="${H}" rx="14" fill="${t.bg}"/>
  <g class="fade">
    <text x="${pad}" y="34" class="head">Latest builds</text>
    <text x="${pad}" y="53" class="sub">My ${repos.length === 1 ? 'most recently pushed repository' : `${repos.length} most recently pushed repositories`} · refreshed automatically</text>
  </g>${repos.length ? cards : `
  <text x="${W / 2}" y="${headerH + cardH / 2}" class="sub" text-anchor="middle">No public repositories to show yet.</text>`}
</svg>
`;
}

const repos = await fetchRepos();
if (!repos.length) console.warn(`No eligible repos found for ${USER} (public, non-fork, non-archived).`);
for (const [name, theme] of Object.entries(THEMES)) {
  const file = `showcase-${name}.svg`;
  writeFileSync(file, render(repos, theme));
  console.log(`Wrote ${file}: ${repos.map(r => r.name).join(', ') || '(empty)'}`);
}
