import React from 'react';

export default function Terminal({ result, collapsed, onToggle, onClear, running, error }) {
  return (
    <div
      className={`bg-bg-800 border-t border-bg-600 flex flex-col flex-shrink-0 transition-all ${
        collapsed ? 'h-9' : 'h-[300px]'
      }`}
    >
      <div className="h-9 flex items-center px-3 border-b border-bg-600 flex-shrink-0">
        <button onClick={onToggle} className="text-xs text-gray-400 hover:text-white flex items-center gap-2">
          <span>{collapsed ? '▶' : '▼'}</span>
          <span className="uppercase tracking-widest font-semibold">Terminal</span>
        </button>
        {result && !collapsed && (
          <div className="ml-4 text-xs text-gray-400 font-mono">
            <span className="text-green-400">{result.counts.passed} passed</span>
            {' · '}
            <span className="text-red-400">{result.counts.failed} failed</span>
            {' · '}
            <span className="text-orange-400">{result.counts.errors} errors</span>
            {result.counts.skipped > 0 && (
              <>
                {' · '}
                <span className="text-gray-500">{result.counts.skipped} skipped</span>
              </>
            )}
          </div>
        )}
        <div className="flex-1" />
        {!collapsed && (
          <button onClick={onClear} className="text-xs text-gray-500 hover:text-white">
            Clear
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed">
          {running && (
            <div className="flex items-center gap-2 text-gray-400">
              <span className="spinner w-3 h-3" />
              Running tests...
            </div>
          )}
          {!running && !result && !error && (
            <div className="text-gray-500">Click "Run Tests" to execute the test suite.</div>
          )}
          {error && (
            <div className="text-orange-400 whitespace-pre-wrap">{error}</div>
          )}
          {result && !running && (
            <>
              {result.tests.length === 0 && (
                <div className="text-orange-400 whitespace-pre-wrap">
                  No tests were detected. Raw output:
                  {'\n'}
                  {result.rawStderr}
                </div>
              )}
              {result.tests.map((t, idx) => (
                <div key={idx} className="mb-1">
                  <div className="flex items-start gap-2">
                    <span className={
                      t.status === 'pass' ? 'text-green-400'
                      : t.status === 'fail' ? 'text-red-400'
                      : t.status === 'error' ? 'text-orange-400'
                      : 'text-gray-500'
                    }>
                      {t.status === 'pass' ? '✓' : t.status === 'fail' ? '✗' : t.status === 'error' ? '⚠' : '○'}
                    </span>
                    <span className="text-gray-200">{t.name}</span>
                    <span className="text-gray-600 text-[11px]">{t.klass}</span>
                  </div>
                  {t.status !== 'pass' && (t.expected || t.actual) && (
                    <div className="ml-5 text-[11px] text-red-300 mt-0.5">
                      Expected: <span className="text-green-300">{t.expected}</span>
                      {'   '}Got: <span className="text-red-400">{t.actual}</span>
                    </div>
                  )}
                  {t.status !== 'pass' && !t.expected && t.assertion && (
                    <div className="ml-5 text-[11px] text-red-300 mt-0.5">{t.assertion}</div>
                  )}
                  {t.status === 'error' && t.detail && (
                    <div className="ml-5 text-[11px] text-orange-300 mt-0.5 whitespace-pre-wrap">
                      {t.detail.split('\n').slice(0, 5).join('\n')}
                    </div>
                  )}
                </div>
              ))}
              {result.summary && (
                <div className="mt-3 pt-2 border-t border-bg-600 text-gray-400">{result.summary}</div>
              )}
              {result.stdout && result.stdout.trim() && (
                <div className="mt-3 pt-2 border-t border-bg-600">
                  <div className="text-xs text-gray-500 mb-1">stdout</div>
                  <pre className="text-gray-300 whitespace-pre-wrap">{result.stdout}</pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
