// Leonida Legends — the hand-in program for gta6-trophy-guide-01.
//
// This program takes the guide as it sits in this repository — the app/
// folder with the tracker and its trophy data, plus the screenshots/ folder
// with the four renders — and lays them out in the output directory the
// grader reads, then writes the dossier that describes them.
//
// The dossier is built with the vendored make.fun library, which must stay
// exactly as the kit shipped it: the scorer rebuilds the same dossier from
// the same library and compares the two byte for byte, so any change to
// vendor/makefun-frontend.ts would fail the hand-in.
//
// When run outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from an empty output directory so a stale file from an earlier run
// can never ride along into the hand-in.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

// The guide itself, exactly as authored.
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

// The four screenshots of the running guide.
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier the judge reads: the guide's text (capped at 160 KiB), at most
// four screenshots of at most 256 KiB each, and the app's own caps of 993
// files and 48 MiB. These are the same limits the scorer enforces.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
