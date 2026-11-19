// Leonida Legends — the program that hands this guide in.
//
// It gathers the finished guide (the app/ folder: tracker, trophy data,
// styles) and the four screenshots, lays them out in the directory the
// grader reads, and writes the dossier.json that describes them for the
// judge. The dossier comes from the vendored make.fun library, which must
// stay exactly as the kit shipped it — the scorer rebuilds the same file
// from its own copy and compares the two byte for byte.
//
// One rule shapes this whole file: the output directory itself is never
// removed. In the grader's sandbox /output is a mounted volume, and
// deleting a mount point fails outright. So the program only ever creates
// the directory (mkdir -p style) and, to keep stale files from an earlier
// run out of the hand-in, clears the three children it owns — app/,
// screenshots/ and dossier.json — before copying fresh ones in.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Never run with the output directory pointed at the repository itself:
// the children cleanup below would wipe the guide it is meant to hand in.
if (resolve(outputDir) === resolve(repoRoot)) {
  throw new Error('MAKEFUN_OUTPUT_DIR must not be the repository root');
}

// Make sure the output directory exists. It is created, never deleted:
// on the grader it is a mount point, and removing a mount point throws.
mkdirSync(outputDir, { recursive: true });

// Clear only the children this program owns, so nothing stale from an
// earlier run can ride along into the hand-in.
for (const child of ['app', 'screenshots', 'dossier.json']) {
  const childPath = join(outputDir, child);
  if (existsSync(childPath)) rmSync(childPath, { recursive: true, force: true });
}

// The guide itself, exactly as authored.
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

// The four screenshots of the running guide.
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier the judge reads: the guide's text (capped at 160 KiB), at
// most four screenshots of at most 256 KiB each, and the app's own caps of
// 993 files and 48 MiB. These are the same limits the scorer enforces.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
