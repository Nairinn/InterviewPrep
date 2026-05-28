import React, { useEffect, useState } from 'react';
import { chat } from '../api/kimi.js';
import { MODES } from '../api/generate.js';
import { accentClasses, formatTime } from '../utils/format.js';

export default function DebriefScreen({ session, onRestart }) {
  const { modeId, domain, checkpoints, checkpointTimes, totalElapsed, messages, reason } = session;
  const mode = MODES[modeId];
  const a = accentClasses(mode.accent);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const chatHistory = messages
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join('\n\n');
        const prompt = `Based on the following chat history from a ${mode.label} coding interview practice session on a ${domain} codebase, give the candidate honest specific feedback on: their debugging or implementation approach, how effectively they used AI without over-relying on it, quality of reasoning communicated in chat, and 2-3 concrete things to improve before a real interview. Be direct and specific, not generic or encouraging.\n\nChat history:\n${chatHistory || '(no chat history)'}\n\nCheckpoints completed: ${checkpoints.filter((c) => c.complete).length} of ${checkpoints.length}.`;
        const reply = await chat(
          [
            { role: 'system', content: 'You are a senior engineer giving a candid post-interview debrief. Be specific, not generic.' },
            { role: 'user', content: prompt },
          ],
          { temperature: 0.4 }
        );
        if (!cancelled) {
          setFeedback(reply);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || String(err));
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-full w-full overflow-y-auto bg-bg-900">
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className={`text-xs ${a.text} uppercase tracking-widest mb-2`}>Session complete</div>
        <h1 className="text-3xl font-semibold mb-1">Debrief</h1>
        <div className="text-gray-400 text-sm mb-1">
          {mode.label} · {domain}
        </div>
        <div className="text-gray-500 text-xs mb-8">Reason: {reason}</div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {checkpoints.map((cp) => (
            <div key={cp.id} className="bg-bg-800 border border-bg-600 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">CP {cp.id}</div>
              <div className="text-sm font-medium text-gray-200 mb-2">{cp.title}</div>
              <div className="text-xs text-gray-400 font-mono">
                {cp.complete ? `✓ ${formatTime(checkpointTimes[cp.id] || 0)}` : '— incomplete'}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-500 mb-8">
          Total session time: <span className="text-gray-300 font-mono">{formatTime(totalElapsed)}</span>
        </div>

        <div className="bg-bg-800 border border-bg-600 rounded-lg p-5 mb-8">
          <div className={`text-xs ${a.text} uppercase tracking-widest mb-3 font-semibold`}>
            Interview Feedback
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="spinner w-4 h-4" /> Generating feedback...
            </div>
          )}
          {error && <div className="text-sm text-red-400">{error}</div>}
          {feedback && (
            <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{feedback}</div>
          )}
        </div>

        <div className="bg-bg-800 border border-bg-600 rounded-lg p-5 mb-8">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">
            Chat history ({messages.length} messages)
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-sm text-gray-500">No messages in this session.</div>
            )}
            {messages.map((m, idx) => (
              <div key={idx}>
                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{m.role}</div>
                <div className="text-sm text-gray-200 whitespace-pre-wrap bg-bg-900 rounded-md p-2.5 border border-bg-600">
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onRestart}
          className={`px-5 py-2.5 ${a.bg} ${a.hover} text-white rounded-md text-sm font-medium`}
        >
          Try Another Problem →
        </button>
      </div>
    </div>
  );
}
