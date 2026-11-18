import { mkdir, writeFile } from 'node:fs/promises';

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required');

const query = `query { user(login: "krithi-1304") { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { contributionCount date } } } } } }`;
const response = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
});
if (!response.ok) throw new Error(`GitHub API failed: ${response.status}`);
const payload = await response.json();
if (payload.errors) throw new Error(payload.errors.map((error) => error.message).join('; '));

const calendar = payload.data.user.contributionsCollection.contributionCalendar;
const weeks = calendar.weeks;
const cell = 13;
const gap = 4;
const x0 = 190;
const y0 = 90;
const plotWidth = weeks.length * (cell + gap) - gap;
const total = calendar.totalContributions;
const max = Math.max(...weeks.flatMap((week) => week.contributionDays.map((day) => day.contributionCount)), 1);
const palette = ['#25122f', '#60204e', '#a52c73', '#ed4ca3', '#ff9bd2'];
const colorFor = (count) => count === 0 ? palette[0] : palette[Math.min(palette.length - 1, Math.ceil((count / max) * (palette.length - 1)))];
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

const cells = weeks.flatMap((week, weekIndex) => week.contributionDays.map((day, dayIndex) => {
  const x = x0 + weekIndex * (cell + gap);
  const y = y0 + dayIndex * (cell + gap);
  const delay = ((weekIndex * 7 + dayIndex) % 17) * 0.08;
  return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="4" fill="${colorFor(day.contributionCount)}" data-count="${day.contributionCount}" data-date="${escape(day.date)}" style="animation-delay:${delay.toFixed(2)}s"/>`;
})).join('');

const monthLabels = weeks.map((week, index) => {
  const date = week.contributionDays[0]?.date;
  if (!date || index === 0 || date.slice(8) > '07') return '';
  return `<text x="${x0 + index * (cell + gap)}" y="72">${new Date(`${date}T00:00:00Z`).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()}</text>`;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 260" role="img" aria-labelledby="title desc">
  <title id="title">${total} GitHub contributions in the last year</title>
  <desc id="desc">An animated pink contribution heatmap generated from Krithi's public GitHub contribution calendar.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#100817"/><stop offset="1" stop-color="#23102b"/></linearGradient>
    <linearGradient id="chrome" x1="0" x2="1"><stop stop-color="#f472b6"/><stop offset=".5" stop-color="#f5d0fe"/><stop offset="1" stop-color="#67e8f9"/></linearGradient>
    <style>
      text{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1px} rect{animation:light 3.8s ease-in-out infinite alternate} .scan{animation:scan 6s linear infinite}@keyframes light{to{filter:brightness(1.42)}}@keyframes scan{to{transform:translateY(168px)}}
    </style>
  </defs>
  <rect width="1400" height="260" rx="24" fill="url(#bg)" stroke="url(#chrome)" stroke-opacity=".58"/>
  <text x="40" y="42" fill="#f9a8d4" font-size="14">/ CONTRIBUTION CONSOLE / LAST 12 MONTHS</text>
  <text x="1360" y="42" text-anchor="end" fill="#67e8f9" font-size="14">${total} SIGNALS</text>
  <text x="40" y="120" fill="#c4b5fd" font-size="12">MON</text><text x="40" y="158" fill="#c4b5fd" font-size="12">WED</text><text x="40" y="196" fill="#c4b5fd" font-size="12">FRI</text>
  <g fill="#c4b5fd" font-size="11">${monthLabels}</g>
  <g>${cells}</g>
  <path class="scan" d="M176 88H1360" stroke="#67e8f9" stroke-opacity=".18"/>
  <g transform="translate(1090 218)" font-size="11" fill="#94a3b8"><text x="0" y="0">LESS</text>${palette.map((color, index) => `<rect x="${38 + index * 20}" y="-11" width="12" height="12" rx="3" fill="${color}"/>`).join('')}<text x="154" y="0">MORE</text></g>
</svg>`;

await mkdir('assets', { recursive: true });
await writeFile('assets/contributions.svg', svg);
console.log(`Generated contributions.svg from ${total} contributions.`);
