#!/usr/bin/env node
/**
 * generate-taxonomy.mjs
 *
 * Fetches Wikipedia's "Outline of academic disciplines" and derives a 3-level
 * knowledge taxonomy (category → domain → subjects). Output: taxonomy.json.
 *
 *   node scripts/generate-taxonomy.mjs
 *
 * The Wikipedia page is the single source of truth — adding a new mindmap or
 * Wikipedia section automatically flows through on the next run.
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../packages/client/src/config/taxonomy.json');

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const PAGE = 'Outline of academic_disciplines';

// Sections to exclude (not knowledge domains).
const SKIP_H2 = new Set(['See also', 'Notes', 'Further reading', 'External links', 'References']);

// Cap subjects per domain for onboarding UX (Wikipedia lists are ordered by importance).
const MAX_SUBJECTS_PER_DOMAIN = 10;

// Skip subjects with labels longer than this (usually descriptions, not topic names).
const MAX_LABEL_LENGTH = 30;

// Curated Iconify icon mapping for well-known disciplines. Anything not listed
// here gets a generic icon and the client resolves the real one via useConceptIcon.
const ICON_MAP = {
  // Top-level
  'Humanities': 'ph:users-three',
  'Social science': 'ph:users',
  'Natural science': 'ph:leaf',
  'Formal science': 'ph:math-operations',
  'Applied science': 'ph:wrench',
  // Humanities
  'History': 'ph:clock-countdown',
  'Languages and literature': 'ph:books',
  'Philosophy': 'ph:lightbulb',
  'Religious studies': 'ph:book-open',
  'Theology': 'ph:book-open',
  'Performing arts': 'ph:masks-theater',
  'Visual arts': 'ph:paint-brush',
  'Law': 'ph:scales',
  'Divinity': 'ph:book-open',
  'Religion': 'ph:book-open',
  // Social
  'Anthropology': 'ph:users-four',
  'Economics': 'ph:chart-line-up',
  'Geography': 'ph:globe-hemisphere-west',
  'Political science': 'ph:building',
  'Psychology': 'ph:brain',
  'Sociology': 'ph:users-three',
  'Business': 'ph:briefcase',
  'Linguistics': 'ph:chat-text',
  'Archaeology': 'ph:hammer',
  // Natural
  'Biology': 'ph:dna',
  'Chemistry': 'ph:flask',
  'Physics': 'ph:atom',
  'Earth science': 'ph:globe',
  'Astronomy': 'ph:telescope',
  'Space sciences': 'ph:planet',
  // Formal
  'Computer science': 'ph:computer-tower',
  'Mathematics': 'ph:calculator',
  'Logic': 'ph:puzzle-piece',
  'Statistics': 'ph:chart-bar',
  // Applied
  'Engineering and technology': 'ph:wrench',
  'Medicine and health': 'ph:heartbeat',
  'Agriculture': 'ph:plant',
  'Architecture and design': 'ph:ruler',
  'Education': 'ph:graduation-cap',
};

function slugify(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pickIcon(label) {
  return ICON_MAP[label] ?? 'ph:circle-half';
}

/**
 * Parse wikitext into a taxonomy tree.
 * Structure:
 *   == Category ==         → level 1
 *   === Domain ===         → level 2
 *   * [[Subject]]          → level 3 (list items under the domain)
 */
function parseWikitext(wikitext) {
  const lines = wikitext.split('\n');
  const taxonomy = [];
  let currentH2 = null;
  let currentH3 = null;
  let inSkipSection = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Wiki headings: == H2 ==, === H3 ===, ==== H4 ==== etc.
    // Backreference \1 ensures opening and closing markers have the same length.
    const heading = line.match(/^(={2,})\s*(.+?)\s*\1$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].replace(/\s*\(.+?\)\s*/g, '').trim();

      if (level === 2) {
        if (SKIP_H2.has(title)) { inSkipSection = true; continue; }
        inSkipSection = false;
        const slug = slugify(title);
        currentH2 = { id: slug, label: title, icon: pickIcon(title), children: [] };
        taxonomy.push(currentH2);
        currentH3 = null;
        continue;
      }

      if (inSkipSection) continue;

      if (level === 3 && currentH2) {
        const slug = slugify(title);
        currentH3 = { id: `${currentH2.id}-${slug}`, label: title, icon: pickIcon(title), children: [] };
        currentH2.children.push(currentH3);
        continue;
      }

      // H4+ are sub-domains — flatten into H3's children as subjects.
      if (level >= 4 && currentH3) {
        const slug = slugify(title);
        currentH3.children.push({ id: `${currentH3.id}-${slug}`, label: title, icon: pickIcon(title) });
        continue;
      }
      continue;
    }

    if (inSkipSection || !currentH3) continue;

    // Top-level list item: * [[Article]] or * [[Article|Label]]
    const li = line.match(/^\*\s*\[\[([^\]]+)\]\]/);
    if (li) {
      if (currentH3.children.length >= MAX_SUBJECTS_PER_DOMAIN) continue;
      const link = li[1];
      const parts = link.split('|');
      const rawLabel = (parts[1] ?? parts[0]).replace(/^(Outline of|List of)\s+/i, '').trim();
      const label = rawLabel.replace(/\s*\(.*?\)\s*/g, '').trim();
      if (!label || label.length > MAX_LABEL_LENGTH) continue;
      const slug = slugify(label);
      if (currentH3.children.some(c => c.label === label)) continue;
      currentH3.children.push({ id: `${currentH3.id}-${slug}`, label, icon: pickIcon(label) });
      continue;
    }
  }

  return taxonomy;
}

async function main() {
  console.log('Fetching Wikipedia page...');
  const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(PAGE)}&format=json&prop=wikitext&formatversion=2`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipedia API returned ${res.status}`);
  const data = await res.json();
  const wikitext = data.parse.wikitext;

  console.log('Parsing taxonomy...');
  const taxonomy = parseWikitext(wikitext);

  // Stats
  const domainCount = taxonomy.reduce((sum, cat) => sum + cat.children.length, 0);
  const subjectCount = taxonomy.reduce(
    (sum, cat) => sum + cat.children.reduce((s, dom) => s + dom.children.length, 0),
    0,
  );

  console.log(`Generated: ${taxonomy.length} categories, ${domainCount} domains, ${subjectCount} subjects`);
  console.log(`Writing to ${OUT_PATH}`);
  writeFileSync(OUT_PATH, JSON.stringify(taxonomy, null, 2) + '\n', 'utf8');
  console.log('Done.');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
