import React, { useEffect, useState } from 'react';
import { fetchHistory } from '../api/problems.js';
import { MODES } from '../api/generate.js';
import { accentClasses, formatTime } from '../utils/format.js';

export default function HistoryModal({ onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchHistory();
        if (!cancelled) {
          setHistory(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load history');
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const grouped = history.reduce((acc, entry) => {
    const mode = entry.mode || 'unknown';
    if (!acc[mode]) acc[mode] = [];
    acc[mode].push(entry);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-bg-800 border border-bg-600 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-lg font-semibold">Solved History</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
            <span className="spinner w-4 h-4" /> Loading...
          </div>
        )}

        {error && (
          <div className="text-sm text-red-400 py-4">{error}</div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="text-sm text-gray-500 py-8 text-center">
            No solved problems yet. Complete a session to see it here.
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="overflow-y-auto space-y-4 pr-1">
            {Object.entries(grouped).map(([modeId, entries]) => {
              const mode = MODES[modeId] || { label: modeId, accent: 'gray' };
              const a = accentClasses(mode.accent);
              return (
                <div key={modeId}>
                  <div className={`text-xs ${a.text} uppercase tracking-widest mb-2 font-semibold`}>
                    {mode.label} ({entries.length})
                  </div>
                  <div className="space-y-2">
                    {entries.map((entry, idx) => (
                      <div key={idx} className="bg-bg-900 border border-bg-600 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm font-medium text-gray-200">
                            {entry.domain || 'Untitled'}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {entry.generated ? 'AI-generated' : 'Seed'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>Total: <span className="text-gray-300 font-mono">{formatTime(entry.totalTime || 0)}</span></span>
                          <span>·</span>
                          <span>{Object.keys(entry.checkpointTimes || {}).length} checkpoints</span>
                          <span>·</span>
                          <span>{new Date(entry.completedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-bg-600 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-bg-700 hover:bg-bg-600 rounded-md text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
