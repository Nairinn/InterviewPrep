import React from 'react';
import { MODES } from '../api/generate.js';
import { accentClasses, formatTime } from '../utils/format.js';

export default function Navbar({
  modeId,
  sessionSeconds,
  checkpoints,
  currentCheckpointIdx,
  onRunTests,
  onRunCode,
  onNewProblem,
  onHistory,
  runningTests,
  runningCode,
  pyodideReady,
  hasMain,
}) {
  const mode = MODES[modeId];
  const a = accentClasses(mode.accent);
  const lowTime = sessionSeconds <= 600;

  return (
    <div className="h-14 bg-bg-800 border-b border-bg-600 flex items-center px-4 gap-4 flex-shrink-0">
      <div className="font-semibold text-gray-100">InterviewPad</div>
      <div className={`px-2 py-1 rounded text-xs font-medium ${a.bgSoft} ${a.text}`}>{mode.label}</div>

      {/* Checkpoint progress */}
      <div className="flex items-center gap-1.5 ml-2">
        {checkpoints.map((cp, idx) => {
          const state =
            cp.complete ? 'done' : idx === currentCheckpointIdx ? 'active' : idx < currentCheckpointIdx ? 'done' : 'locked';
          const dotBase = 'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors';
          const dotCls =
            state === 'done'
              ? `${a.bg} text-white`
              : state === 'active'
              ? `${a.bgSoft} ${a.text} ring-2 ${a.ring}`
              : 'bg-bg-700 text-gray-500';
          return (
            <div key={cp.id} className="flex items-center">
              <div className={`${dotBase} ${dotCls}`} title={cp.title}>
                {state === 'done' ? '✓' : cp.id}
              </div>
              {idx < checkpoints.length - 1 && (
                <div className={`w-6 h-px ${state === 'done' ? a.bg : 'bg-bg-600'}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-1" />

      <div
        className="px-2 py-1 rounded text-xs text-gray-500 border border-bg-600 cursor-not-allowed"
        title="More languages coming soon"
      >
        Python ▾
      </div>

      <div className="text-xs text-gray-500 font-mono">kimi-k2.6</div>

      <div className={`font-mono text-sm tabular-nums ${lowTime ? 'text-red-400' : 'text-gray-200'}`}>
        {formatTime(sessionSeconds)}
      </div>

      <button
        onClick={onHistory}
        className="px-3 py-1.5 bg-bg-700 hover:bg-bg-600 rounded text-xs"
      >
        History
      </button>

      <button
        onClick={onNewProblem}
        className="px-3 py-1.5 bg-bg-700 hover:bg-bg-600 rounded text-xs"
      >
        New Problem
      </button>

      {hasMain && (
        <button
          onClick={onRunCode}
          disabled={runningCode || runningTests || !pyodideReady}
          className="px-3 py-1.5 bg-bg-700 hover:bg-bg-600 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title={!pyodideReady ? 'Loading Python runtime...' : 'Run main.py'}
        >
          {runningCode ? <span className="spinner w-3 h-3" /> : '▶'}
          Run
        </button>
      )}

      <button
        onClick={onRunTests}
        disabled={runningTests || runningCode || !pyodideReady}
        className={`px-3 py-1.5 ${a.bg} ${a.hover} text-white rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
        title={!pyodideReady ? 'Loading Python runtime...' : ''}
      >
        {runningTests ? <span className="spinner w-3 h-3" /> : '▶'}
        Run Tests
      </button>
    </div>
  );
}
