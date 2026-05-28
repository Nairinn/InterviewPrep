import React from 'react';
import { MODES } from '../api/generate.js';
import { accentClasses } from '../utils/format.js';

export default function StartScreen({ onPick }) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-bg-900 overflow-auto">
      <div className="max-w-5xl w-full px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-semibold tracking-tight">InterviewPad</h1>
          <p className="text-gray-400 mt-2">
            AI-assisted coding interview practice — Meta / Notion / Google format
          </p>
          <p className="text-xs text-gray-500 mt-3 font-mono">
            60 min · 4 checkpoints · Python · chat: moonshot-v1-8k · generation: llama-3.3-70b
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Object.values(MODES).map((mode) => {
            const a = accentClasses(mode.accent);
            return (
              <button
                key={mode.id}
                onClick={() => onPick(mode.id)}
                className={`group text-left bg-bg-800 hover:bg-bg-700 border border-bg-600 hover:${a.border} rounded-xl p-6 transition-all`}
              >
                <div className={`inline-block w-10 h-10 rounded-lg ${a.bgSoft} ${a.text} flex items-center justify-center text-lg font-bold mb-3`}>
                  {mode.label[0]}
                </div>
                <div className={`text-lg font-medium ${a.text} mb-2`}>{mode.label}</div>
                <div className="text-sm text-gray-400 leading-relaxed">{mode.description}</div>
              </button>
            );
          })}
        </div>

        <div className="text-center mt-10 text-xs text-gray-500">
          Tip: set <code className="text-gray-400">VITE_OPENAI_API_KEY</code> in <code className="text-gray-400">.env</code> before starting.
        </div>
      </div>
    </div>
  );
}
