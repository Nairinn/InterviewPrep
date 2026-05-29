import { useEffect, useRef, useState } from 'react';

const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/';

export function usePyodide() {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const pyodideRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        if (!window.loadPyodide) {
          throw new Error('Pyodide script not loaded. Check index.html.');
        }
        const py = await window.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
        if (cancelled) return;
        pyodideRef.current = py;
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err.message || String(err));
        setStatus('error');
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Run a Python test file against the in-memory file map.
   * @param {Record<string,string>} fileMap - filename -> content (no test file)
   * @param {{ name: string, content: string }} testFile
   * @returns {Promise<{ stdout: string, stderr: string }>}
   */
  async function runTests(fileMap, testFile) {
    const py = pyodideRef.current;
    if (!py) throw new Error('Pyodide not ready');

    // Write all files into /home/pyodide
    const workdir = '/home/pyodide';
    try {
      py.FS.mkdir(workdir);
    } catch (_) {
      /* exists */
    }

    // Clear any previous python files in workdir
    try {
      const entries = py.FS.readdir(workdir);
      for (const entry of entries) {
        if (entry === '.' || entry === '..') continue;
        if (entry.endsWith('.py')) {
          try {
            py.FS.unlink(`${workdir}/${entry}`);
          } catch (_) {}
        }
      }
    } catch (_) {}

    for (const [name, content] of Object.entries(fileMap)) {
      py.FS.writeFile(`${workdir}/${name}`, content);
    }
    py.FS.writeFile(`${workdir}/${testFile.name}`, testFile.content);

    // Reset sys.path and clear module cache for the workdir
    await py.runPythonAsync(`
import sys, importlib
if '${workdir}' not in sys.path:
    sys.path.insert(0, '${workdir}')
# Drop cached modules that came from workdir
to_drop = []
for mod_name, mod in list(sys.modules.items()):
    f = getattr(mod, '__file__', None) or ''
    if f.startswith('${workdir}'):
        to_drop.append(mod_name)
for n in to_drop:
    del sys.modules[n]
`);

    const code = `
import io, sys, unittest, traceback
_stdout = io.StringIO()
_stderr = io.StringIO()
_old_out, _old_err = sys.stdout, sys.stderr
sys.stdout, sys.stderr = _stdout, _stderr
try:
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromName('${testFile.name.replace('.py', '')}')
    runner = unittest.TextTestRunner(stream=_stderr, verbosity=2)
    runner.run(suite)
except Exception:
    traceback.print_exc(file=_stderr)
finally:
    sys.stdout, sys.stderr = _old_out, _old_err
(_stdout.getvalue(), _stderr.getvalue())
`;
    const result = await py.runPythonAsync(code);
    // result is a PyProxy tuple
    const arr = result.toJs();
    result.destroy?.();
    return { stdout: arr[0] || '', stderr: arr[1] || '' };
  }

  return { status, error, runTests };
}

/**
 * Parse unittest verbosity=2 output into structured test results.
 */
export function parseUnittestOutput(stderr) {
  const lines = stderr.split('\n');
  const tests = [];
  const failureBlocks = {};

  // Python 3.11+ unittest verbosity=2 has two formats:
  //   Without docstring: "test_name (module.Class.test_name) ... ok"
  //   With docstring:    "test_name (module.Class.test_name)\nDocstring ... ok"
  // So we look for the result on the same line OR the next line.
  const startRe = /^(test_\S+)\s*\(([^)]+)\)(?:\s+(.*))?$/;
  const resultTailRe = /\.\.\.\s*(ok|FAIL|ERROR|skipped[^\n]*)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(startRe);
    if (!m) continue;
    const testName = m[1];
    const klass = m[2];
    const trailing = m[3] || '';
    let statusRaw = '';

    const sameLine = trailing.match(resultTailRe);
    if (sameLine) {
      statusRaw = sameLine[1];
    } else if (i + 1 < lines.length) {
      // Result is on the next line (docstring case)
      const next = lines[i + 1].match(resultTailRe);
      if (next) {
        statusRaw = next[1];
        i++; // consume the result line
      }
    }

    const s = statusRaw.toLowerCase();
    tests.push({
      name: testName,
      klass,
      status:
        s.startsWith('ok') ? 'pass'
        : s.startsWith('fail') ? 'fail'
        : s.startsWith('error') ? 'error'
        : s.startsWith('skip') ? 'skip'
        : 'unknown',
      detail: '',
    });
  }

  // Pass 2: collect FAIL / ERROR detail blocks
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^(FAIL|ERROR): (test_\S+)\s*\(([^)]+)\)/);
    if (m) {
      const kind = m[1];
      const name = m[2];
      // Collect block until next separator
      const block = [];
      i++;
      while (i < lines.length && !/^={3,}|^-{3,}/.test(lines[i])) {
        block.push(lines[i]);
        i++;
      }
      // skip the separator line
      while (i < lines.length && /^-{3,}/.test(lines[i])) i++;
      const detailText = block.join('\n').trim();
      failureBlocks[name] = { kind, detail: detailText };
    } else {
      i++;
    }
  }

  // Merge detail into tests
  for (const t of tests) {
    if (failureBlocks[t.name]) {
      t.detail = failureBlocks[t.name].detail;
    }
  }

  // Summary
  const summaryRe = /^(?:OK|FAILED).*$/;
  let summaryLine = '';
  for (const line of lines) {
    if (/^Ran \d+ test/.test(line) || summaryRe.test(line)) {
      summaryLine += (summaryLine ? ' — ' : '') + line.trim();
    }
  }

  const counts = {
    passed: tests.filter((t) => t.status === 'pass').length,
    failed: tests.filter((t) => t.status === 'fail').length,
    errors: tests.filter((t) => t.status === 'error').length,
    skipped: tests.filter((t) => t.status === 'skip').length,
  };

  // Try to extract "Expected: X Got: Y" from assertion details
  for (const t of tests) {
    if (t.detail) {
      const eq = t.detail.match(/AssertionError:\s*(.+?)\s*(?:!=|\bnot equal to\b)\s*(.+?)(?:\n|$)/);
      if (eq) {
        t.expected = eq[2];
        t.actual = eq[1];
      } else {
        const assertion = t.detail.match(/AssertionError:\s*(.+?)(?:\n|$)/);
        if (assertion) {
          t.assertion = assertion[1];
        }
      }
    }
  }

  return { tests, counts, summary: summaryLine };
}
