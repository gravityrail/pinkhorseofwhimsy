#!/usr/bin/env node

/**
 * PDF Generator for Grass Valley Game Club
 *
 * Generates printable PDFs from the Docusaurus site.
 * Requires: npm install puppeteer (run from the scripts/ directory)
 *
 * Usage:
 *   node scripts/generate-pdfs.mjs
 *
 * Prerequisites:
 *   1. Build the site first: cd site && npm run build && npm run serve
 *   2. The site should be running at http://localhost:3000
 */

import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'pdfs');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const PAGES = [
  // Curriculum
  { path: '/docs/curriculum/', filename: '00-curriculum-overview.pdf', title: 'Curriculum Overview' },
  { path: '/docs/curriculum/week-1/', filename: '01-week-1-foundations.pdf', title: 'Week 1 - Foundations' },
  { path: '/docs/curriculum/week-1/quiz', filename: '01-week-1-quiz.pdf', title: 'Week 1 - Quiz' },
  { path: '/docs/curriculum/week-2/', filename: '02-week-2-sprites.pdf', title: 'Week 2 - Sprites & Movement' },
  { path: '/docs/curriculum/week-2/quiz', filename: '02-week-2-quiz.pdf', title: 'Week 2 - Quiz' },
  { path: '/docs/curriculum/week-3/', filename: '03-week-3-enemies.pdf', title: 'Week 3 - Enemies & Level Design' },
  { path: '/docs/curriculum/week-3/quiz', filename: '03-week-3-quiz.pdf', title: 'Week 3 - Quiz' },
  { path: '/docs/curriculum/week-4/', filename: '04-week-4-polish.pdf', title: 'Week 4 - Polish & Publishing' },
  { path: '/docs/curriculum/week-4/quiz', filename: '04-week-4-quiz.pdf', title: 'Week 4 - Quiz' },
  { path: '/docs/curriculum/week-5/', filename: '05-week-5-3d-space.pdf', title: 'Week 5 - 3D Space' },
  { path: '/docs/curriculum/week-5/quiz', filename: '05-week-5-quiz.pdf', title: 'Week 5 - Quiz' },
  { path: '/docs/curriculum/week-6/', filename: '06-week-6-3d-interaction.pdf', title: 'Week 6 - 3D Interaction' },
  { path: '/docs/curriculum/week-6/quiz', filename: '06-week-6-quiz.pdf', title: 'Week 6 - Quiz' },
  { path: '/docs/curriculum/week-7/', filename: '07-week-7-3d-polish.pdf', title: 'Week 7 - 3D Polish' },
  { path: '/docs/curriculum/week-7/quiz', filename: '07-week-7-quiz.pdf', title: 'Week 7 - Quiz' },
  { path: '/docs/curriculum/week-8/', filename: '08-week-8-demo-day.pdf', title: 'Week 8 - Demo Day' },
  // Worksheets
  { path: '/docs/worksheets/pixel-art-grid', filename: 'worksheet-pixel-art-grid.pdf', title: 'Pixel Art Grid' },
  { path: '/docs/worksheets/level-design', filename: 'worksheet-level-design.pdf', title: 'Level Design Planner' },
  { path: '/docs/worksheets/game-design-doc', filename: 'worksheet-game-design-doc.pdf', title: 'Game Design Document' },
  // Resources
  { path: '/docs/resources/', filename: 'resources.pdf', title: 'Resources & Further Reading' },
];

async function generatePDFs() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`Generating PDFs from ${BASE_URL}...`);
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  const browser = await puppeteer.launch({ headless: true });

  for (const page of PAGES) {
    const url = `${BASE_URL}${page.path}`;
    const outputPath = join(OUTPUT_DIR, page.filename);

    process.stdout.write(`  ${page.title}... `);

    try {
      const tab = await browser.newPage();
      await tab.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Hide navigation, sidebar, and other non-content elements
      await tab.addStyleTag({
        content: `
          .navbar, .footer, .pagination-nav, .theme-doc-sidebar-container,
          .theme-doc-toc-desktop, .theme-doc-breadcrumbs,
          .pixel-art-widget.no-print {
            display: none !important;
          }
          .main-wrapper { margin: 0 !important; padding: 0 !important; }
          details { border: 1px solid #ccc; padding: 0.5rem; margin: 0.5rem 0; }
          details summary { font-weight: bold; cursor: pointer; }
          @page { margin: 1.5cm; }
          body { font-size: 12px; }
          h1 { font-size: 24px; margin-top: 0; }
          h2 { font-size: 18px; }
          h3 { font-size: 15px; }
          table { font-size: 11px; }
        `,
      });

      await tab.pdf({
        path: outputPath,
        format: 'Letter',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 9px; width: 100%; text-align: center; color: #666;">
            Grass Valley Game Club &mdash; ${page.title}
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 9px; width: 100%; text-align: center; color: #666;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
        margin: { top: '2cm', bottom: '2cm', left: '1.5cm', right: '1.5cm' },
      });

      await tab.close();
      console.log('done');
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`\nAll PDFs saved to ${OUTPUT_DIR}/`);
}

generatePDFs().catch(console.error);
