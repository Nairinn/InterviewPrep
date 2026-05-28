import React, { useState } from 'react';
import { MODES } from '../api/generate.js';
import { accentClasses } from '../utils/format.js';

export default function NewProblemModal({ currentModeId, onClose, onRegenerate }) {
  const [modeId, setModeId] = useState(currentModeId);
  const [hint, setHint] = useState('');
  const mode = MODES[modeId];
  const a = accentClasses(mode.accent);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-bg-800 border border-bg-600 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Generate a New Problem</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-5">
          This will reset your session and generate a fresh codebase.
        </p>

        <label className="block text-xs text-gray-400 mb-1.5">Mode</label>
        <select
          value={modeId}
          onChange={(e) => setModeId(e.target.value)}
          className="w-full bg-bg-700 border border-bg-600 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:border-gray-400"
        >
          {Object.values(MODES).map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>

        <label className="block text-xs text-gray-400 mb-1.5">
          Domain hint <span className="text-gray-600">(optional)</span>
        </label>
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="e.g. graph traversal, async bugs, BST, CLI tool"
          className="w-full bg-bg-700 border border-bg-600 rounded-md px-3 py-2 text-sm mb-6 focus:outline-none focus:border-gray-400"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-bg-700 hover:bg-bg-600 rounded-md text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onRegenerate(modeId, hint.trim())}
            className={`flex-1 px-4 py-2 ${a.bg} ${a.hover} text-white rounded-md text-sm font-medium`}
          >
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
