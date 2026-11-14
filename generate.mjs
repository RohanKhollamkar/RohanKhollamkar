// Generates animated "case study" cards (one SVG per repo) for a GitHub profile README.
//
// Usage:  node generate.mjs            live data from the GitHub API, updates README between markers
//         node generate.mjs --sample   built-in sample data, writes showcase/ only (local preview)
//
// Env:   GH_USER (default RohanKhollamkar), REPO_COUNT (default: config.count or 2),
//        EXCLUDE (comma-separated repo names), GITHUB_TOKEN (optional, raises API rate limit)
// Files: showcase.config.json  optional per-repo overrides (title, tagline, stats, tags, visual ...)
//        README.md             must contain <!--SHOWCASE:START--> ... <!--SHOWCASE:END-->

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

const USER = process.env.GH_USER || 'RohanKhollamkar';
const TOKEN = process.env.GITHUB_TOKEN;
const SAMPLE = process.argv.includes('--sample');
const OUT = 'showcase';

const CONFIG = existsSync('showcase.config.json') ? JSON.parse(readFileSync('showcase.config.json', 'utf8')) : {};
const COUNT = Number(process.env.REPO_COUNT || CONFIG.count || 2);
const EXCLUDE = [...(CONFIG.exclude || []), ...(process.env.EXCLUDE || '').split(',')]
  .map(s => s.trim().toLowerCase()).filter(Boolean);
const OVERRIDES = Object.fromEntries(
  Object.entries(CONFIG.repos || {}).map(([k, v]) => [k.toLowerCase(), v]),
);

// ---------- design tokens ----------
const ROSE = '#f0a6c4';
const ROSE_DIM = '#d68aae';
const TEXT = '#f7eef2';
const MUTED = '#b7a0ab';
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
const SERIF = "Georgia, 'Times New Roman', 'Liberation Serif', serif";
const W = 1000, H = 360;

// ---------- data ----------
const SAMPLE_REPOS = [
  { name: 'mcp-trust-fabric', description: 'A trust layer that lets AI agents verify the MCP tools they call before using them.', language: 'TypeScript', topics: ['mcp', 'agents', 'security'], stargazers_count: 12, forks_count: 3, created_at: '2026-09-02T10:00:00Z', pushed_at: '2026-11-08T10:00:00Z', _langs: { TypeScript: 82000, Python: 14000, Shell: 2000 } },
  { name: 'director-agent', description: 'Async, orchestration-based storyboard generator that coordinates multiple agents into one video plan.', language: 'Python', topics: ['orchestration', 'video'], stargazers_count: 7, forks_count: 1, created_at: '2026-10-01T10:00:00Z', pushed_at: '2026-11-02T10:00:00Z', _langs: { Python: 60000, JavaScript: 9000 } },
  { name: 'policy-doc-qa', description: 'Turns long, dense policy documents into answers you can check against the source.', language: 'Python', topics: ['llm', 'nlp'], stargazers_count: 3, forks_count: 0, created_at: '2026-08-02T10:00:00Z', pushed_at: '2026-10-20T10:00:00Z', _langs: { Python: 40000 } },
  { name: 'payment-gateway', description: 'UPI and card payments on a strict processing to success or failed state machine.', language: 'JavaScript', topics: ['payments', 'api'], stargazers_count: 5, forks_count: 2, created_at: '2026-07-02T10:00:00Z', pushed_at: '2026-09-15T10:00:00Z', _langs: { JavaScript: 52000, HTML: 8000 } },
];

async function api(path) {
  const headers = { 'User-Agent': 'repo-showcase', Accept: 'application/vnd.github+json' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path}: ${await res.text()}`);
  return res.json();
}

async function fetchRepos() {
  if (SAMPLE) return SAMPLE_REPOS.slice(0, COUNT);
  const all = await api(`/users/${USER}/repos?sort=pushed&direction=desc&per_page=50&type=owner`);
  return all
    .filter(r => !r.fork && !r.archived && !r.private)
    .filter(r => r.name.toLowerCase() !== USER.toLowerCase()) // skip the profile repo itself
    .filter(r => !EXCLUDE.includes(r.name.toLowerCase()))
    .slice(0, COUNT);
}

async function fetchLangs(r) {
  if (SAMPLE) return r._langs || {};
  try { return await api(`/repos/${USER}/${r.name}/languages`); } catch { return {}; }
}

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '…' : String(s));
const pad2 = n => String(n).padStart(2, '0');
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'repo';
const monthYear = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const year = iso => new Date(iso).getUTCFullYear();

// "mcp-trust-fabric" -> "Mcp Trust Fabric", "IAM-Agent" -> "IAM Agent", "policyDocQa" -> "Policy Doc Qa"
function prettify(name) {
  return String(name)
    .replace(/[-_.]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .map(w => (w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

function wrap(text, max, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; } else { cur = cur ? cur + ' ' + w : w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = clip(lines[maxLines - 1] + ' …', max).replace(/\s*…$/, '…');
  }
  return lines;
}

// ---------- pick an illustration from what the repo is about ----------
const VISUAL_HINTS = {
  network: ['mcp', 'trust', 'network', 'graph', 'iam', 'identity', 'auth', 'security', 'agent', 'permission', 'access'],
  documents: ['doc', 'pdf', 'text', 'nlp', 'rag', 'paper', 'report', 'scrap', 'search', 'summar', 'caption'],
  flow: ['orchestrat', 'workflow', 'storyboard', 'video', 'async', 'schedul', 'coordinat', 'automation'],
  pipeline: ['pipeline', 'etl', 'payment', 'state machine', 'deploy', 'ci', 'queue', 'ingest', 'cleaning', 'analysis', 'eda'],
};
const VISUALS = Object.keys(VISUAL_HINTS);
const PICK_ORDER = ['documents', 'flow', 'pipeline', 'network']; // on a tie the more specific visual wins; network is the generic fallback

function pickVisual(r) {
  const hay = ` ${r.name} ${r.description || ''} ${(r.topics || []).join(' ')} `.toLowerCase().replace(/[-_]/g, ' ');
  let best = null, bestScore = 0;
  for (const v of PICK_ORDER) {
    const score = VISUAL_HINTS[v].filter(k => (k.length <= 3 ? hay.includes(` ${k} `) : hay.includes(k))).length;
    if (score > bestScore) { best = v; bestScore = score; }
  }
  if (best) return best;
  let h = 0;
  for (const ch of r.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return VISUALS[h % VISUALS.length];
}

// ---------- build the card model (auto-derived, then overridden by showcase.config.json) ----------
function model(r, langs, i) {
  const o = OVERRIDES[r.name.toLowerCase()] || {};
  const total = Object.values(langs).reduce((a, b) => a + b, 0);
  const ranked = Object.entries(langs).sort((a, b) => b[1] - a[1]);
  const langNames = ranked.map(([k]) => k);
  const top = ranked[0];
  const topics = r.topics || [];

  const autoStats = [
    top ? { value: `${Math.round((top[1] / total) * 100)}%`, label: top[0] } : { value: '—', label: 'top language' },
    { value: String(langNames.length), label: langNames.length === 1 ? 'language' : 'languages' },
    { value: monthYear(r.pushed_at), label: 'last push' },
  ];
  const autoTags = [...new Set([...langNames.slice(0, 2), ...topics.slice(0, 3)])];
  const visual = o.visual in DRAW ? o.visual : pickVisual(r); // 'storyboard' is config-only, never auto-picked
  const tags = (o.tags?.length ? o.tags : autoTags.length ? autoTags : [r.language || 'Code']).slice(0, 5);

  return {
    name: r.name,
    file: `${slug(r.name)}.svg`,
    url: r.html_url || `https://github.com/${USER}/${r.name}`,
    title: o.title || prettify(r.name),
    eyebrow: o.eyebrow || [pad2(i + 1), ...(topics.length ? topics.slice(0, 2) : [r.language || 'project']), year(r.pushed_at)].join(' · ').toUpperCase(),
    tagline: o.tagline || r.description || 'No description yet.',
    built: o.built || `${(langNames.length ? langNames.slice(0, 3) : [r.language || 'code']).join(' + ').toLowerCase()} · since ${monthYear(r.created_at).toLowerCase()}`,
    stats: (o.stats?.length ? o.stats : autoStats).slice(0, 3),
    tags,
    visual,
    label: o.label || (topics.find(t => t.length <= 14) || visual).toUpperCase(),
    caption: o.caption || tags.slice(0, 3).join(' · ').toLowerCase(),
    chip: o.chip?.length ? o.chip : ['Q · what does it say?', 'A · answer, with source'],
    states: o.states?.length ? o.states : ['running', 'success', 'failed'],
    cost: o.cost,
    thresholds: o.thresholds,
    models: o.models,
  };
}

// ---------- illustrations (drawn in a 336 x 288 box) ----------
const PW = 336, PH = 288;
const PANEL_BG = '#1c1017';

function visNetwork() {
  const cx = PW / 2, cy = PH / 2 - 2, R = 84;
  const pts = Array.from({ length: 6 }, (_, k) => {
    const a = ((k * 60 - 90) * Math.PI) / 180;
    return [cx + Math.cos(a) * R * 1.25, cy + Math.sin(a) * R];
  });
  const f = n => n.toFixed(1);
  const ring = pts.map((p, k) => { const q = pts[(k + 1) % 6]; return `<line x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(q[0])}" y2="${f(q[1])}" stroke="${ROSE_DIM}" stroke-opacity=".22"/>`; }).join('');
  const spokes = pts.map((p, k) => `<line class="dash" x1="${cx}" y1="${cy}" x2="${f(p[0])}" y2="${f(p[1])}" stroke="${ROSE}" stroke-opacity=".7" stroke-dasharray="4 7" style="animation-delay:-${(k * 0.2).toFixed(1)}s"/>`).join('');
  const nodes = pts.map((p, k) => `<circle class="blink" cx="${f(p[0])}" cy="${f(p[1])}" r="9" fill="${PANEL_BG}" stroke="${ROSE}" stroke-width="1.5" style="animation-delay:${(k * 0.35).toFixed(2)}s"/><circle cx="${f(p[0])}" cy="${f(p[1])}" r="3" fill="${ROSE}"/>`).join('');
  return `${ring}${spokes}
      <circle class="ripple" cx="${cx}" cy="${cy}" r="20" fill="none" stroke="${ROSE}"/>
      <circle class="ripple" cx="${cx}" cy="${cy}" r="20" fill="none" stroke="${ROSE}" style="animation-delay:1.5s"/>
      <circle cx="${cx}" cy="${cy}" r="20" fill="${PANEL_BG}" stroke="${ROSE}" stroke-width="1.5"/>
      <circle class="blink" cx="${cx}" cy="${cy}" r="8" fill="${ROSE}"/>
      ${nodes}`;
}

function visDocuments(m) {
  const x = 52, y = 62, w = 150, h = 168;
  const widths = [96, 118, 82, 110, 64, 104, 90];
  const lines = widths.map((lw, k) => (k === 3
    ? `<rect class="blink" x="${x + 16}" y="${y + 24 + k * 19 - 5}" width="${lw + 8}" height="10" rx="3" fill="${ROSE}" fill-opacity=".55"/>`
    : `<line x1="${x + 16}" y1="${y + 24 + k * 19}" x2="${x + 16 + lw}" y2="${y + 24 + k * 19}" stroke="${MUTED}" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>`)).join('');
  const chip = (t, cy, delay) => {
    const s = clip(t, 26), cw = Math.round(s.length * 6.1 + 22);
    return `<g class="pop" style="animation-delay:${delay}s"><rect x="${PW - 18 - cw}" y="${cy}" width="${cw}" height="26" rx="13" fill="#2a1622" stroke="${ROSE}" stroke-opacity=".7"/><text x="${PW - 18 - cw / 2}" y="${cy + 17}" class="mono" font-size="10" fill="${TEXT}" text-anchor="middle">${esc(s)}</text></g>`;
  };
  return `<rect x="${x + 26}" y="${y - 20}" width="${w}" height="${h}" rx="8" fill="${PANEL_BG}" stroke="${ROSE_DIM}" stroke-opacity=".3"/>
      <rect x="${x + 13}" y="${y - 10}" width="${w}" height="${h}" rx="8" fill="${PANEL_BG}" stroke="${ROSE_DIM}" stroke-opacity=".5"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#21131b" stroke="${ROSE}" stroke-opacity=".8"/>
      ${lines}
      <rect class="scan" x="${x + 4}" y="${y + 8}" width="${w - 8}" height="2" rx="1" fill="${ROSE}"/>
      ${chip(m.chip[0], 176, 0)}${m.chip[1] ? chip(m.chip[1], 208, 2) : ''}`;
}

function visFlow() {
  const ins = [64, 126, 188];
  const box = (bx, by, bw, bh, label, delay, strong) => `<g class="blink" style="animation-delay:${delay}s"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="8" fill="${strong ? '#2a1622' : PANEL_BG}" stroke="${ROSE}" stroke-opacity="${strong ? 1 : 0.7}" stroke-width="${strong ? 1.5 : 1}"/><text x="${bx + bw / 2}" y="${by + bh / 2 + 4}" class="mono" font-size="10" fill="${strong ? ROSE : MUTED}" text-anchor="middle">${label}</text></g>`;
  const paths = ins.map((iy, k) => `<path class="dash" d="M92 ${iy + 16} C 116 ${iy + 16}, 112 142, 136 142" fill="none" stroke="${ROSE}" stroke-opacity=".7" stroke-dasharray="4 7" style="animation-delay:-${(k * 0.3).toFixed(1)}s"/>`).join('');
  return `${paths}
      <path class="dash" d="M212 142 H 252" fill="none" stroke="${ROSE}" stroke-dasharray="4 7"/>
      ${ins.map((iy, k) => box(24, iy, 68, 32, pad2(k + 1), k * 0.5, false)).join('')}
      ${box(136, 114, 76, 56, 'CORE', 1.5, true)}
      ${box(252, 126, 62, 32, 'OUT', 2, false)}
      <circle class="ripple" cx="283" cy="142" r="14" fill="none" stroke="${ROSE}" style="animation-delay:2s"/>`;
}

function visPipeline(m) {
  const xs = [48, 128, 208, 288], y = 112, len = xs[3] - xs[0];
  const stages = xs.map((sx, k) => `<circle cx="${sx}" cy="${y}" r="14" fill="${PANEL_BG}" stroke="${ROSE_DIM}" stroke-opacity=".6"/><circle class="stage" cx="${sx}" cy="${y}" r="7" fill="${ROSE}" style="animation-delay:${k}s"/><text x="${sx}" y="${y + 36}" class="mono" font-size="9" fill="${MUTED}" text-anchor="middle">${pad2(k + 1)}</text>`).join('');
  const dots = [ROSE, '#8fd6a8', '#e2707f'];
  let px = 18;
  const pills = m.states.slice(0, 3).map((s, k) => {
    const t = clip(s, 10), pw = Math.round(t.length * 6.1 + 30), x0 = px;
    px += pw + 8;
    return `<g class="state" style="animation-delay:${k * 1.5}s"><rect x="${x0}" y="184" width="${pw}" height="26" rx="13" fill="#2a1622" stroke="${dots[k]}" stroke-opacity=".7"/><circle cx="${x0 + 13}" cy="197" r="3.5" fill="${dots[k]}"/><text x="${x0 + 22}" y="201" class="mono" font-size="10" fill="${TEXT}">${esc(t)}</text></g>`;
  }).join('');
  return `<line x1="${xs[0]}" y1="${y}" x2="${xs[3]}" y2="${y}" stroke="${ROSE_DIM}" stroke-opacity=".3" stroke-width="2"/>
      <line class="fill" x1="${xs[0]}" y1="${y}" x2="${xs[3]}" y2="${y}" stroke="${ROSE}" stroke-width="2" stroke-dasharray="${len}" stroke-dashoffset="${len}" style="--len:${len}"/>
      ${stages}
      ${pills}`;
}

// storyboard: planner (LLM) -> executor fans out six shot jobs -> assembly, with pre-flight estimate vs actual cost
function visStoryboard(m) {
  const T = 12; // seconds per loop
  const f = t => (t / T).toFixed(4);
  // opacity 0 until `at` seconds, then visible until the loop resets
  const show = at => `<animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" values="0;0;1;1;0" keyTimes="0;${f(at)};${f(at + 0.15)};0.955;1"/>`;
  const grow = (w, from, to) => `<animate attributeName="width" dur="${T}s" repeatCount="indefinite" values="0;0;${w};${w};0" keyTimes="0;${f(from)};${f(to)};0.955;1"/>`;
  const box = (x, y, w, h, strong) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${strong ? '#2a1622' : PANEL_BG}" stroke="${ROSE}" stroke-opacity="${strong ? 1 : 0.75}" stroke-width="${strong ? 1.4 : 1}"/>`;
  const chip = (x, y, w, t) => `<rect x="${x}" y="${y}" width="${w}" height="15" rx="7.5" fill="${ROSE}" fill-opacity=".16" stroke="${ROSE}" stroke-opacity=".6"/><text x="${x + w / 2}" y="${y + 11}" class="mono" font-size="8.5" fill="${ROSE}" text-anchor="middle">${t}</text>`;
  const OK = '#8fd6a8', BAD = '#e2707f', AMBER = '#ffc857'; // amber = everything about the drift threshold
  const est = Number(m.cost?.estimate ?? 9.3), act = Number(m.cost?.actual ?? 8.08);
  const money = n => `$${n.toFixed(2)}`;
  const barW = 126, actW = Math.max(4, Math.round(barW * Math.min(act / est, 1)));
  const saved = est - act, pct = Math.round((saved / est) * 100);

  const models = m.models?.length ? m.models : ['seedance 2.0', 'wan 2.6', 'veo 3.1', 'kling 3.0', 'sora 2', 'runway gen-4'];
  const thresholds = (m.thresholds?.length ? m.thresholds : [0.78, 0.86, 0.9, 0.82, 0.88, 0.8]).map(Number); // per shot: render class + model
  const attempts = [1, 1, 2, 1, 3, 1];         // illustrative: shot 03 passes on its 2nd try, shot 05 on its 3rd
  const start = k => 2 + k * 0.25, step = 1;   // each attempt takes `step` seconds
  const pass = k => start(k) + attempts[k] * step;
  const by = k => 93 + k * 12;                 // text baseline of lane k

  const lanes = [0, 1, 2, 3, 4, 5].map(k => {
    const y = by(k), mid = y - 3;
    const pips = [0, 1, 2].map(j => {
      const px = 270 + j * 10;
      const base = `<circle cx="${px}" cy="${mid}" r="2.6" fill="none" stroke="${ROSE_DIM}" stroke-opacity=".7"/>`;
      if (j >= attempts[k]) return base;
      const last = j === attempts[k] - 1;
      return `${base}<circle cx="${px}" cy="${mid}" r="2.6" fill="${last ? OK : BAD}">${show(start(k) + (j + 1) * step)}</circle>`;
    }).join('');
    return `<path class="dash" d="M308 ${mid} H301" fill="none" stroke="${ROSE}" stroke-opacity=".7" stroke-dasharray="2 3"/>
      <path d="M303.5 ${mid - 2.5} L300 ${mid} L303.5 ${mid + 2.5}" fill="none" stroke="${ROSE}" stroke-opacity=".8" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="32" y="${y - 8.5}" width="266" height="11" rx="3" fill="${PANEL_BG}" stroke="${ROSE_DIM}" stroke-opacity=".45"/>
      <rect x="32" y="${y - 8.5}" width="266" height="11" rx="3" fill="${ROSE}" fill-opacity=".16" stroke="${ROSE}" stroke-opacity=".8">${show(pass(k))}</rect>
      <text x="38" y="${y}" class="mono" font-size="8.5" fill="${MUTED}">${pad2(k + 1)}</text>
      <text x="58" y="${y}" class="mono" font-size="8.5" fill="${TEXT}">${esc(clip(models[k % models.length], 16))}</text>
      <text x="186" y="${y}" class="mono" font-size="8.5" font-weight="700" fill="${AMBER}" text-anchor="middle">${thresholds[k % thresholds.length].toFixed(2)}</text>
      ${pips}
      <path d="M32 ${mid} H24" fill="none" stroke="${ROSE_DIM}" stroke-opacity=".6"/>`;
  }).join('');
  const strip = [0, 1, 2, 3, 4, 5].map(k => `<rect x="${92 + k * 9}" y="174" width="7" height="10" rx="1.5" fill="none" stroke="${ROSE_DIM}" stroke-opacity=".6"/><rect x="${92 + k * 9}" y="174" width="7" height="10" rx="1.5" fill="${ROSE}">${show(pass(k) + 0.2)}</rect>`).join('');
  const done = Math.max(...[0, 1, 2, 3, 4, 5].map(pass));

  return `<g class="blink">${box(18, 40, 150, 26, false)}</g>
      <text x="27" y="57" class="mono" font-size="9.5" fill="${TEXT}">VISION PLANNER</text>${chip(125, 45.5, 36, 'LLM')}
      <path class="dash" d="M168 53 H190" fill="none" stroke="${ROSE}" stroke-dasharray="3 4"/>
      <circle r="2.4" fill="#fff"><animateMotion dur="1.4s" repeatCount="indefinite" path="M168 53 H190"/></circle>
      ${box(190, 40, 128, 26, true)}
      <text x="200" y="57" class="mono" font-size="9.5" fill="${ROSE}">EXECUTOR</text>${chip(274, 45.5, 36, 'DAG')}
      <text x="38" y="80" class="mono" font-size="7" letter-spacing=".6" fill="${MUTED}">SHOT · MODEL</text>
      <text x="186" y="80" class="mono" font-size="7" letter-spacing=".6" font-weight="700" fill="${AMBER}" text-anchor="middle">DRIFT THRESHOLD PER SHOT</text>
      <text x="298" y="80" class="mono" font-size="7" letter-spacing=".4" fill="${MUTED}" text-anchor="end">≤3 TRIES</text>
      <path class="dash" d="M308 66 V${by(5) - 3}" fill="none" stroke="${ROSE}" stroke-opacity=".7" stroke-dasharray="3 4"/>
      ${lanes}
      <path d="M24 ${by(0) - 3} V164" fill="none" stroke="${ROSE_DIM}" stroke-opacity=".6"/>
      <path d="M21 161.5 L24 166 L27 161.5" fill="none" stroke="${ROSE}" stroke-opacity=".8" stroke-linecap="round" stroke-linejoin="round"/>
      ${box(18, 166, 300, 26, false)}
      <text x="27" y="183" class="mono" font-size="9.5" fill="${TEXT}">ASSEMBLY</text>${strip}
      <path d="M152 179 H166" fill="none" stroke="${ROSE}" stroke-opacity=".8"/><path d="M162 175.5 L166.5 179 L162 182.5" fill="none" stroke="${ROSE}" stroke-opacity=".8" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="174" y="171" width="136" height="16" rx="8" fill="none" stroke="${ROSE_DIM}" stroke-opacity=".6"/>
      <rect x="174" y="171" width="136" height="16" rx="8" fill="${ROSE}">${show(done + 0.7)}</rect>
      <text x="242" y="182.5" class="mono" font-size="8.5" letter-spacing=".8" fill="${MUTED}" text-anchor="middle">FINAL STORYBOARD</text>
      <text x="242" y="182.5" class="mono" font-size="8.5" letter-spacing=".8" font-weight="700" fill="#14070d" text-anchor="middle">FINAL STORYBOARD${show(done + 0.7)}</text>

      <text x="18" y="211" class="mono" font-size="8.5" letter-spacing=".8" fill="${MUTED}">$ PRE-FLIGHT EST</text>
      <rect x="128" y="205" width="${barW}" height="6" rx="3" fill="none" stroke="${ROSE_DIM}" stroke-opacity=".5" stroke-dasharray="2 3"/>
      <rect x="128" y="205" width="${barW}" height="6" rx="3" fill="${ROSE_DIM}" fill-opacity=".6">${grow(barW, 0.3, 1.3)}</rect>
      <text x="318" y="212" class="mono" font-size="10" font-weight="700" fill="${TEXT}" text-anchor="end">${money(est)}${show(1.3)}</text>
      <text x="18" y="227" class="mono" font-size="8.5" letter-spacing=".8" fill="${MUTED}">$ ACTUAL COST</text>
      <rect x="128" y="221" width="${barW}" height="6" rx="3" fill="none" stroke="${ROSE_DIM}" stroke-opacity=".3"/>
      <rect x="128" y="221" width="${actW}" height="6" rx="3" fill="${ROSE}">${grow(actW, start(0), done)}</rect>
      <text x="318" y="228" class="mono" font-size="10" font-weight="700" fill="${ROSE}" text-anchor="end">${money(act)}${show(done)}</text>
      <line x1="${128 + barW}" y1="201" x2="${128 + barW}" y2="231" stroke="${ROSE}" stroke-opacity=".6" stroke-dasharray="2 2"/>
      ${saved > 0 ? `<text x="318" y="246" class="mono" font-size="9" fill="${OK}" text-anchor="end">saved ${money(saved)} · ${pct}% under estimate${show(done + 1.2)}</text>` : ''}`;
}

const DRAW = { network: visNetwork, documents: visDocuments, flow: visFlow, pipeline: visPipeline, storyboard: visStoryboard };

// ---------- card ----------
function render(m) {
  const L = 44;
  const title = clip(m.title, 30);
  const titleSize = title.length > 22 ? 32 : title.length > 16 ? 38 : 44;
  const tagline = wrap(m.tagline, 62, 2);
  const builtY = 150 + tagline.length * 23 + 12;

  const stats = m.stats.map((s, k) => {
    const v = clip(s.value, 9);
    return `<text x="${L + k * 178}" y="266" class="serif" font-size="${v.length > 5 ? 26 : 32}" fill="${ROSE}">${esc(v)}</text><text x="${L + k * 178}" y="286" class="mono" font-size="10" letter-spacing="1" fill="${MUTED}">${esc(clip(s.label, 22).toUpperCase())}</text>`;
  }).join('');

  let px = L;
  const pills = m.tags.map(t => {
    const s = clip(t, 18), pw = Math.round(s.length * 6.7 + 24);
    if (px + pw > 590) return '';
    const out = `<rect x="${px}" y="306" width="${pw}" height="24" rx="12" fill="${ROSE}" fill-opacity=".08" stroke="${ROSE}" stroke-opacity=".4"/><text x="${px + pw / 2}" y="322" class="mono" font-size="11" fill="${ROSE}" text-anchor="middle">${esc(s)}</text>`;
    px += pw + 8;
    return out;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(m.title)}: ${esc(m.tagline)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#140c11"/><stop offset="1" stop-color="#26121c"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.8" cy="0.45" r="0.5">
      <stop offset="0" stop-color="${ROSE}" stop-opacity=".16"/><stop offset="1" stop-color="${ROSE}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <style>
    .mono { font-family: ${MONO}; }
    .serif { font-family: ${SERIF}; }
    .sans { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; }
    .in { animation: rise .8s ease-out both; }
    .dash { animation: dash 1.1s linear infinite; }
    .blink { animation: blink 3s ease-in-out infinite; }
    .ripple { transform-box: fill-box; transform-origin: center; animation: ripple 3s ease-out infinite; }
    .scan { animation: scan 3.2s ease-in-out infinite alternate; }
    .pop { animation: pop 4s ease-in-out infinite; }
    .stage { animation: stage 4s linear infinite; }
    .fill { animation: fill 4s linear infinite; }
    .state { animation: state 4.5s linear infinite; }
    .cursor { animation: cursor 1s steps(1) infinite; }
    @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes dash { to { stroke-dashoffset: -22; } }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
    @keyframes ripple { from { transform: scale(1); opacity: .7; } to { transform: scale(2.4); opacity: 0; } }
    @keyframes scan { from { transform: translateY(0); } to { transform: translateY(150px); } }
    @keyframes pop { 0%,100% { opacity: .35; } 25%,60% { opacity: 1; } }
    @keyframes stage { 0%,100% { opacity: .2; } 10%,40% { opacity: 1; } }
    @keyframes fill { 0% { stroke-dashoffset: var(--len); } 75%,100% { stroke-dashoffset: 0; } }
    @keyframes state { 0%,100% { opacity: .35; } 8%,30% { opacity: 1; } }
    @keyframes cursor { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .in,.dash,.blink,.ripple,.scan,.pop,.stage,.fill,.state,.cursor { animation: none; opacity: 1; }
      .fill { stroke-dashoffset: 0; }
    }
  </style>
  <rect width="${W}" height="${H}" rx="20" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" rx="20" fill="url(#glow)"/>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" fill="none" stroke="${ROSE}" stroke-opacity=".28"/>

  <g class="in">
    <text x="${L}" y="60" class="mono" font-size="12" letter-spacing="2.5" fill="${ROSE}">${esc(clip(m.eyebrow, 52))}</text>
    <text x="${L}" y="${titleSize > 40 ? 114 : 110}" class="serif" font-size="${titleSize}" fill="${TEXT}">${esc(title)}</text>
    ${tagline.map((l, k) => `<text x="${L}" y="${150 + k * 23}" class="sans" font-size="15" fill="${MUTED}">${esc(l)}</text>`).join('\n    ')}
    <text x="${L}" y="${builtY}" class="mono" font-size="12" fill="${TEXT}"><tspan fill="${ROSE}" letter-spacing="1.5">BUILT &gt;</tspan> ${esc(clip(m.built, 58))}<tspan class="cursor" fill="${ROSE}"> ▍</tspan></text>
  </g>
  <g class="in" style="animation-delay:.2s">
    <line x1="${L}" y1="232" x2="590" y2="232" stroke="${ROSE}" stroke-opacity=".18"/>
    ${stats}
    ${pills}
  </g>

  <g class="in" style="animation-delay:.35s">
    <g transform="translate(628 36)">
      <rect width="${PW}" height="${PH}" rx="16" fill="${PANEL_BG}" fill-opacity=".75" stroke="${ROSE}" stroke-opacity=".2"/>
      <text x="18" y="28" class="mono" font-size="11" letter-spacing="2.5" fill="${ROSE}">${esc(clip(m.label, 22).toUpperCase())}</text>
      ${DRAW[m.visual](m)}
      <text x="18" y="${PH - 16}" class="mono" font-size="${m.caption.length > 48 ? 8 : 10}" fill="${MUTED}">${esc(clip(m.caption, m.caption.length > 48 ? 62 : 46))}</text>
    </g>
  </g>
</svg>
`;
}

// ---------- README block ----------
const START = '<!--SHOWCASE:START-->', END = '<!--SHOWCASE:END-->';

function updateReadme(models) {
  if (!existsSync('README.md')) { console.warn('README.md not found, skipped README update.'); return; }
  const readme = readFileSync('README.md', 'utf8');
  const a = readme.indexOf(START), b = readme.indexOf(END);
  if (a === -1 || b === -1 || b < a) { console.warn(`README.md has no ${START} / ${END} markers, skipped README update.`); return; }
  const block = [
    '<div align="center">',
    '',
    ...models.map(m => `<a href="${m.url}"><img src="${OUT}/${m.file}" alt="${esc(m.title)}: ${esc(clip(m.tagline, 120))}" width="100%"></a>`),
    '',
    '</div>',
  ].join('\n');
  const next = `${readme.slice(0, a + START.length)}\n${block}\n${readme.slice(b)}`;
  if (next !== readme) writeFileSync('README.md', next);
}

// ---------- main ----------
const repos = await fetchRepos();
if (!repos.length) throw new Error(`No eligible public repos found for ${USER}`);

const models = [];
for (const [i, r] of repos.entries()) models.push(model(r, await fetchLangs(r), i));

mkdirSync(OUT, { recursive: true });
const keep = new Set(models.map(m => m.file));
for (const f of readdirSync(OUT)) if (f.endsWith('.svg') && !keep.has(f)) rmSync(`${OUT}/${f}`); // drop cards of repos that rotated out
for (const m of models) writeFileSync(`${OUT}/${m.file}`, render(m));
if (!SAMPLE) updateReadme(models);

console.log(`Wrote ${models.length} card(s) to ${OUT}/ for: ${models.map(m => `${m.name} [${m.visual}]`).join(', ')}`);
