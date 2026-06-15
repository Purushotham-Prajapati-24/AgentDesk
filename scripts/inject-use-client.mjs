#!/usr/bin/env node
/**
 * inject-use-client.mjs
 *
 * Post-build step for `@agentdesk/react`. Walks the bundled `dist/`
 * directory and prepends the `'use client';` directive to every emitted
 * `.js` and `.cjs` file. This is required because esbuild (the bundler
 * tsup wraps) only preserves KNOWN module-level directives (`'use strict'`,
 * `'use asm'`) and silently strips unknown ones like `'use client'`.
 *
 * The script is idempotent: re-running it on an already-injected file
 * is a no-op. It also skips source maps, type declarations, and any
 * other non-JS artifact under the target directory.
 *
 * Usage:
 *   node scripts/inject-use-client.mjs <dist-dir> [<dist-dir> ...]
 *
 * Exit codes:
 *   0  success
 *   1  usage error (no target dir supplied, or target dir missing)
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

const USE_CLIENT_DIRECTIVE = "'use client';";
const TARGET_EXTENSIONS = new Set(['.js', '.cjs']);
const SKIP_SUFFIXES = ['.map', '.d.ts', '.d.mts', '.d.cts'];

function usageAndExit(message) {
  if (message) {
    process.stderr.write(`inject-use-client: ${message}\n`);
  }
  process.stderr.write(
    'usage: node scripts/inject-use-client.mjs <dist-dir> [<dist-dir> ...]\n',
  );
  process.exit(1);
}

function toAbsolutePath(candidate) {
  if (isAbsolute(candidate)) return candidate;
  // Resolve relative paths against `process.cwd()` so the command
  // behaves intuitively when invoked from an npm `build` script (which
  // runs with `cwd` set to the package directory by npm). Callers who
  // want a different anchor can pass an absolute path.
  return resolve(process.cwd(), candidate);
}

function shouldProcessFile(fileName) {
  if (SKIP_SUFFIXES.some((suffix) => fileName.endsWith(suffix))) return false;
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return false;
  return TARGET_EXTENSIONS.has(fileName.slice(lastDot));
}

async function listJsFiles(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (err) {
      if (err && err.code === 'ENOENT') return out;
      throw err;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && shouldProcessFile(entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

async function injectDirective(filePath) {
  const original = await readFile(filePath, 'utf8');
  // Idempotency: skip files that already start with the directive.
  // We compare against the directive + newline to avoid false positives
  // from files that happen to contain `'use client'` inside a string.
  if (original.startsWith(`${USE_CLIENT_DIRECTIVE}\n`)) return false;
  if (original.startsWith(USE_CLIENT_DIRECTIVE)) {
    // File starts with the directive but no newline — normalize by
    // ensuring a newline follows so downstream parsers see a clean
    // directive prologue.
    const rest = original.slice(USE_CLIENT_DIRECTIVE.length);
    await writeFile(filePath, `${USE_CLIENT_DIRECTIVE}\n${rest}`, 'utf8');
    return true;
  }
  await writeFile(filePath, `${USE_CLIENT_DIRECTIVE}\n${original}`, 'utf8');
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    usageAndExit('at least one dist directory is required');
  }
  const targets = args.map((arg) => toAbsolutePath(arg));

  let processed = 0;
  let skipped = 0;
  for (const target of targets) {
    let info;
    try {
      info = await stat(target);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        process.stderr.write(
          `inject-use-client: target directory does not exist: ${target}\n`,
        );
        process.exit(1);
      }
      throw err;
    }
    if (!info.isDirectory()) {
      usageAndExit(`not a directory: ${target}`);
    }
    const files = await listJsFiles(target);
    for (const file of files) {
      // Use a path relative to the target for nicer logs.
      const display = file.startsWith(target) ? file.slice(target.length + 1) : file;
      const changed = await injectDirective(file);
      if (changed) {
        processed += 1;
        process.stdout.write(`+ ${display}\n`);
      } else {
        skipped += 1;
      }
    }
  }

  process.stdout.write(
    `inject-use-client: processed=${processed} skipped=${skipped} root${targets.length > 1 ? 's' : ''}=${targets.length}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`inject-use-client: ${err && err.stack ? err.stack : String(err)}\n`);
  process.exit(1);
});
