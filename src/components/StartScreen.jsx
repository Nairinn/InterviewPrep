import React from 'react';
import { MODES } from '../api/generate.js';
import { accentClasses } from '../utils/format.js';

const difficultyTone = {
  Easy: 'bg-emerald-500/15 text-emerald-300',
  Medium: 'bg-amber-500/15 text-amber-300',
  Hard: 'bg-red-500/15 text-red-300',
};

export default function StartScreen({ onPick }) {
  const modes = Object.values(MODES);

  return (
    <div className="h-full w-full flex items-center justify-center bg-bg-900 overflow-auto">
      <div className="max-w-6xl w-full px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-semibold tracking-tight">InterviewPad</h1>
          <p className="text-gray-400 mt-2">
            AI-assisted coding interview practice — Meta / Notion / Google format
          </p>
          <p className="text-xs text-gray-500 mt-3 font-mono">
            60 min · 4 checkpoints · Python · chat: kimi-k2.6 · generation: llama-3.3-70b
          </p>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {modes.map((mode) => {
            const a = accentClasses(mode.accent);
            const tone = difficultyTone[mode.difficulty] || 'bg-bg-700 text-gray-300';
            return (
              <button
                key={mode.id}
                onClick={() => onPick(mode.id)}
                className={`group text-left bg-bg-800 hover:bg-bg-700 border border-bg-600 hover:${a.border} rounded-xl p-6 transition-all flex flex-col`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${a.bgSoft} ${a.text} flex items-center justify-center text-lg font-bold flex-shrink-0`}
                  >
                    {mode.label[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-lg font-medium ${a.text} leading-tight`}>{mode.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{mode.tagline}</div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${tone} flex-shrink-0`}>
                    {mode.difficulty}
                  </span>
                </div>

                <p className="text-sm text-gray-400 leading-relaxed mb-4">{mode.description}</p>

                <div className="mt-auto">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-2">
                    What you'll do
                  </div>
                  <ul className="space-y-1.5">
                    {mode.keyTraits.map((trait, idx) => (
                      <li key={idx} className="text-[12.5px] text-gray-300 leading-snug flex gap-2">
                        <span className={`${a.text} flex-shrink-0`}>›</span>
                        <span>{trait}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="text-[11px] text-gray-500 mt-4 pt-3 border-t border-bg-600">
                    <span className="text-gray-400 font-medium">Best for: </span>
                    {mode.bestFor}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick-compare strip: spells out the bug_hunt vs debug distinction */}
        <div className="bg-bg-800/50 border border-bg-600 rounded-lg p-5">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-3">
            Quick compare
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12.5px]">
            {modes.map((mode) => {
              const a = accentClasses(mode.accent);
              return (
                <div key={mode.id} className="flex gap-3">
                  <div className={`w-1 rounded-full ${a.bg} flex-shrink-0`} />
                  <div>
                    <div className={`font-semibold ${a.text} mb-0.5`}>{mode.label}</div>
                    <div className="text-gray-400 leading-relaxed">{mode.vsLine}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
