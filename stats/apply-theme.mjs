// Used by the apply-theme action: reads the settings from the issue text (ISSUE_BODY),
// validates them with normalizeTheme and writes theme.json. Exit code 2 when the text holds no valid JSON.
import { writeFileSync } from 'node:fs';
import { normalizeTheme } from './theme.mjs';

const body = process.env.ISSUE_BODY || '';
const m = body.match(/```(?:json)?\s*([\s\S]*?)```/);
let raw;
try { raw = JSON.parse(m ? m[1] : body); } catch { console.error('No valid JSON found in the issue'); process.exit(2); }

const theme = normalizeTheme(raw);
writeFileSync(process.env.THEME_FILE || 'theme.json', JSON.stringify(theme, null, 2) + '\n');
console.log(JSON.stringify(theme));
