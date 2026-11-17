import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mainPath = join(root, 'dist/styles.css');
const pluginPath = join(root, 'dist/forms-plugin.css');

const pluginCss = readFileSync(pluginPath, 'utf8');
const startRe = /\.form-(?:input|textarea|select|multiselect|checkbox|radio)(?![a-zA-Z0-9_-])/g;

function extractRule(css, startIndex) {
  const brace = css.indexOf('{', startIndex);
  if (brace < 0) {
    return null;
  }
  let depth = 0;
  for (let i = brace; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return css.slice(startIndex, i + 1);
      }
    }
  }
  return null;
}

const blocks = [];
for (const match of pluginCss.matchAll(startRe)) {
  const rule = extractRule(pluginCss, match.index);
  if (rule) {
    blocks.push(rule.trim());
  }
}

if (blocks.length === 0) {
  throw new Error('merge-form-classes: no .form-* rules found in forms-plugin.css');
}

const banner = [
  '',
  '/* @tailwindcss/forms (strategy: class) — opt-in only; does not style host app forms. */',
  ...blocks,
  '',
  '/* Brand overrides after .form-* so radius/padding match buttons (~0.4rem, 8–10px). */',
  '.gf-gateflag-root .form-input,',
  '.gf-gateflag-root .form-select {',
  '  border-radius: 0.4rem;',
  '  border-color: var(--color-gf-border);',
  '  background-color: var(--color-gf-surface);',
  '  color: var(--color-gf-fg);',
  '  padding: 0.55rem 0.625rem;',
  '}',
  '.gf-gateflag-root .form-select {',
  '  background-size: 1.15rem 1.15rem;',
  '  background-position: right 0.625rem center;',
  '  padding-right: 2.5rem;',
  '}',
  '.gf-gateflag-root .form-checkbox {',
  '  width: 18px;',
  '  height: 18px;',
  '  border-radius: 0.4rem;',
  '  border-color: var(--color-gf-border);',
  '  background-color: var(--color-gf-surface);',
  '  color: var(--color-gf-accent);',
  '}',
  '',
].join('\n');

writeFileSync(mainPath, `${readFileSync(mainPath, 'utf8').trimEnd()}\n${banner}`);
console.log(`merge-form-classes: appended ${blocks.length} form class rule(s)`);
