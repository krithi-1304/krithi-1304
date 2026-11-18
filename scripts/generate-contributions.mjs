import { mkdir, writeFile } from 'node:fs/promises';

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required');
const query = `query { user(login: "krithi-1304") { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { contributionCount date } } } } } }`;
const response = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
if (!response.ok) throw new Error(`GitHub API failed: ${response.status}`);
const payload = await response.json();
if (payload.errors) throw new Error(payload.errors.map((error) => error.message).join('; '));

const calendar = payload.data.user.contributionsCollection.contributionCalendar;
const weeks = calendar.weeks;
const cell = 13; const gap = 4; const total = calendar.totalContributions;
const max = Math.max(...weeks.flatMap((week) => week.contributionDays.map((day) => day.contributionCount)), 1);
const activeWeeks = weeks.filter((week) => week.contributionDays.some((day) => day.contributionCount > 0)).length;
const peakDay = weeks.flatMap((week) => week.contributionDays).reduce((peak, day) => day.contributionCount > peak.contributionCount ? day : peak, { contributionCount: 0 });
const palette = ['#4A2A55', '#7B336E', '#FF4FA3', '#CDBAFF', '#A8F1FA'];
const colorFor = (count) => count === 0 ? palette[0] : palette[Math.min(palette.length - 1, Math.ceil((count / max) * (palette.length - 1)))];
const esc = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const cells = weeks.flatMap((week, wi) => week.contributionDays.map((day, di) => `<rect x="${wi * (cell + gap)}" y="${90 + di * (cell + gap)}" width="${cell}" height="${cell}" rx="4" fill="${colorFor(day.contributionCount)}" data-count="${day.contributionCount}" data-date="${esc(day.date)}" style="animation-delay:${((wi * 7 + di) % 17) * .08}s"/>`)).join('');
const months = weeks.map((week, index) => { const date = week.contributionDays[0]?.date; if (!date || index === 0 || date.slice(8) > '07') return ''; return `<text x="${index * (cell + gap)}" y="72">${new Date(`${date}T00:00:00Z`).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()}</text>`; }).join('');
const legend = palette.map((color, index) => `<rect x="${38 + index * 20}" y="-11" width="12" height="12" rx="3" fill="${color}"/>`).join('');
const svg = `<svg width="1400" height="300" viewBox="0 0 1400 300" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc"><title id="title">${total} GitHub contributions in the last year</title><desc id="desc">An animated pink and lilac GitHub contribution garden generated from Krithi's public contribution calendar.</desc><style>text{font-family:'Courier New',monospace;letter-spacing:1px}rect{animation:light 3.8s ease-in-out infinite alternate}.scan{animation:scan 6s linear infinite}@keyframes light{to{filter:brightness(1.4)}}@keyframes scan{to{transform:translateY(168px)}}</style><rect width="1400" height="300" rx="24" fill="#21142C" stroke="#FFB4E2" stroke-opacity=".5"/><text x="40" y="42" fill="#FFB4E2" font-size="14">CONTRIBUTION GARDEN / LAST 12 MONTHS</text><text x="1360" y="42" text-anchor="end" fill="#A8F1FA" font-size="14">REAL GITHUB ACTIVITY</text><g transform="translate(40 78)"><text fill="#A8F1FA" font-size="11">TOTAL SIGNALS</text><text y="42" fill="#FFF4FB" font-size="34">${total}</text><text y="76" fill="#CDBAFF" font-size="11">CONTRIBUTIONS</text><path d="M0 94H110" stroke="#FF4FA3" stroke-width="4"/><text y="126" fill="#A8F1FA" font-size="11">ACTIVE WEEKS</text><text y="160" fill="#FFF4FB" font-size="28">${activeWeeks}<tspan fill="#CDBAFF" font-size="13"> / 53</tspan></text><text y="202" fill="#FFB4E2" font-size="11">PEAK DAY</text><text y="230" fill="#FFF4FB" font-size="18">${peakDay.contributionCount} commits</text></g><g transform="translate(190 0)"><text x="0" y="120" fill="#CDBAFF" font-size="12">MON</text><text x="0" y="158" fill="#CDBAFF" font-size="12">WED</text><text x="0" y="196" fill="#CDBAFF" font-size="12">FRI</text><g fill="#CDBAFF" font-size="11">${months}</g><g>${cells}</g><path class="scan" d="M-14 88H1170" stroke="#A8F1FA" stroke-opacity=".18"/></g><g transform="translate(1090 265)" font-size="11" fill="#9E789D"><text x="0">LESS</text>${legend}<text x="154">MORE</text></g></svg>`;
await mkdir('assets', { recursive: true });
await writeFile('assets/contributions.svg', svg);
console.log(`Generated contributions.svg from ${total} contributions.`);
