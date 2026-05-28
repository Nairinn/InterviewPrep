import React, { useState } from 'react';
import { MODES } from '../api/generate.js';
import { accentClasses } from '../utils/format.js';

export default function ConfirmScreen({ modeId, onConfirm, onBack }) {
  const mode = MODES[modeId];
  const a = accentClasses(mode.accent);
  const [hint, setHint] = useState('');

  return (
    <div className="h-full w-full flex items-center justify-center bg-bg-900">
      <div className="max-w-xl w-full px-8">
        <div className={`text-xs ${a.text} uppercase tracking-widest mb-3`}>You picked</div>
        <h2 className="text-3xl font-semibold mb-2">{mode.label}</h2>
        <p className="text-gray-400 mb-8">{mode.description}</p>

        <div className="bg-bg-800 border border-bg-600 rounded-lg p-5 mb-6">
          <div className="text-sm text-gray-300 mb-3 font-medium">Format</div>
          <ul className="text-sm text-gray-400 space-y-2">
            <li>· 60-minute total session timer</li>
            <li>· 4 checkpoints (checkpoint 1 disables the AI)</li>
            <li>· Real Python execution in the browser via Pyodide</li>
            <li>· Tests are generated dynamically by Kimi</li>
          </ul>
        </div>

        <label className="block text-sm text-gray-400 mb-2">
          Optional domain hint <span className="text-gray-600">(e.g. "graph traversal", "CLI tool")</span>
        </label>
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="leave blank for random"
          className="w-full bg-bg-800 border border-bg-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-8"
        />

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-bg-700 hover:bg-bg-600 rounded-md text-sm transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => onConfirm(hint.trim())}
            className={`flex-1 px-4 py-2 ${a.bg} ${a.hover} text-white rounded-md text-sm font-medium transition-colors`}
          >
            Start Interview →
          </button>
        </div>
      </div>
    </div>
  );
}
