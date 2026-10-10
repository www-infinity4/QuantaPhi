const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const acorn = require('acorn');
const postcss = require('postcss');

// Files that are part of the syntax‑matrix test suite.
const targets = [
  'robot-directions.js',
  'quanta-agent-iterations.js',
  'robot-directions.css',
  'quanta-agent-iterations.css',
];

/**
 * Validate a source string using the appropriate parser based on file extension.
 * Returns an object containing an `ok` flag and a `diagnostics` array.
 * Each diagnostic includes `message`, `line`, `column`, and `offset` when available.
 */
function validate(source, file) {
  try {
    if (file.endsWith('.css')) {
      // postcss throws on syntax errors and includes line/column on the error object.
      postcss.parse(source, { from: file });
    } else {
      // acorn provides location info when `locations:true` is set.
      acorn.parse(source, {
        ecmaVersion: 'latest',
        sourceType: 'script',
        locations: true,
      });
    }
    return { ok: true, diagnostics: [] };
  } catch (e) {
    const line = e.loc?.line || e.line;
    const column = e.loc?.column ?? e.column;
    const offset = e.pos ?? e.offset;
    const diagnostic = {
      message: e.message,
      line,
      column,
      offset,
    };
    return { ok: false, message: e.message, line, column, offset, diagnostics: [diagnostic] };
  }
}

class SyntaxEradicator {
  constructor(root) {
    this.root = path.resolve(root);
  }

  /**
   * Core execution used by the original tests. It validates the current file
   * and optionally attempts to replace it with a candidate after verification.
   */
  async execute({ file_path, candidate, verify }) {
    if (!targets.includes(file_path)) throw Error('Target outside syntax matrix');
    const file = path.join(this.root, file_path);
    const buffer = await fs.readFile(file);
    const source = buffer.toString('utf8');
    const evidence = {
      file: file_path,
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      buffer_base64: buffer.toString('base64'),
      bytes: buffer.length,
      original: validate(source, file_path),
    };
    if (candidate === undefined) return { ...evidence, status: evidence.original.ok ? 'validated' : 'blocked', strategy: 'read-only AST inspection' };
    const check = validate(candidate, file_path);
    if (!check.ok) return { ...evidence, status: 'blocked', candidate: check };
    if (typeof verify !== 'function' || (await verify(candidate, file_path)) !== true) return { ...evidence, status: 'blocked', reason: 'Regression sign-off required' };
    const current = await fs.readFile(file);
    if (!current.equals(buffer)) return { ...evidence, status: 'blocked', reason: 'Source changed since inspection' };
    // Preserve exact original buffers; syntax validity alone is not a runtime pass.
    const temporary = file + '.syntax-' + crypto.randomUUID();
    await fs.writeFile(temporary, candidate, { flag: 'wx', mode: (await fs.stat(file)).mode });
    try {
      await fs.rename(temporary, file);
    } finally {
      await fs.rm(temporary, { force: true });
    }
    return { ...evidence, status: 'written', candidate: check, regression: 'passed' };
  }
}

/**
 * Run the matrix over all target files and return a structured report.
 * Each entry contains the exact source buffer, its SHA‑256 hash, and any
 * diagnostics produced by the parser.
 */
async function runMatrix() {
  const engine = new SyntaxEradicator(path.join(__dirname, '..'));
  const results = [];
  for (const file_path of targets) {
    const file = path.join(engine.root, file_path);
    const buffer = await fs.readFile(file);
    const source = buffer.toString('utf8');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const validation = validate(source, file_path);
    results.push({
      path: file_path,
      buffer: source,
      hash,
      diagnostics: validation.diagnostics,
    });
  }
  return results;
}

async function main() {
  const engine = new SyntaxEradicator(path.join(__dirname, '..')),
    results = [];
  for (const file_path of targets) results.push(await engine.execute({ file_path }));
  await fs.mkdir(path.join(__dirname, '../syntax-evidence'), { recursive: true });
  await fs.writeFile(
    path.join(__dirname, '../syntax-evidence/report.json'),
    JSON.stringify({ job_id: 'IW-20261010-SYNTAX-ERADICATE', at: new Date().toISOString(), results }, null, 2)
  );
  console.log(results.map((x) => ({ file: x.file, status: x.status, error: x.original.ok ? null : x.original })));
  if (results.some((x) => x.status === 'blocked')) process.exitCode = 1;
}

module.exports = { SyntaxEradicator, validate, runMatrix };
if (require.main === module) main().catch((e) => { console.error(e); process.exitCode = 1; });
