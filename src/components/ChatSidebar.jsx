import React, { useEffect, useRef, useState } from 'react';
import { chat } from '../api/kimi.js';
import { accentClasses } from '../utils/format.js';

const BASE_SYSTEM = `You are an AI coding assistant embedded in a technical interview simulator. The candidate is working on a multi-file Python codebase. You can see the current file they have open. Help with scaffolding, boilerplate, and clarifying questions — but do NOT hand them the solution. If they ask you to solve something outright, ask 'what have you tried so far?' first. Be concise and Socratic.`;

const DEBUG_ADDENDUM = ` The candidate is debugging multiple simultaneous subtle bugs producing wrong output across different files. When they describe symptoms ask: 'what does the output tell you?', 'which file do you think is responsible?', 'what did you expect vs what did you get?' Do not confirm whether their hypothesis is correct — make them verify it by reading the code or running tests.`;

export default function ChatSidebar({ enabled, modeId, accent, activeFileName, activeFileContent, messages, setMessages }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const a = accentClasses(accent);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  async function send() {
    if (!input.trim() || sending || !enabled) return;
    const userMsg = { role: 'user', content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setSending(true);
    setError(null);

    try {
      let system = BASE_SYSTEM;
      if (modeId === 'debug') system += DEBUG_ADDENDUM;
      system += `\n\nThe candidate's currently open file is: ${activeFileName || 'none'}\n`;
      if (activeFileContent) {
        system += `--- BEGIN ${activeFileName} ---\n${activeFileContent}\n--- END ${activeFileName} ---`;
      }

      const reply = await chat(
        [
          { role: 'system', content: system },
          ...next.map((m) => ({ role: m.role, content: m.content })),
        ],
        { temperature: 0.4 }
      );
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSending(false);
    }
  }

  function onKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  }

  if (!enabled) {
    return (
      <div className="h-full bg-bg-800 border-l border-bg-600 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <div className="text-sm font-medium text-gray-200 mb-2">AI is disabled</div>
        <div className="text-xs text-gray-500 leading-relaxed">
          This checkpoint requires you to work without AI assistance. Use the editor, the test output, and your own reasoning.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-bg-800 border-l border-bg-600 flex flex-col">
      <div className="px-3 py-2 border-b border-bg-600 flex items-center flex-shrink-0">
        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">AI Assistant</div>
        <div className="flex-1" />
        <div className="text-[10px] text-gray-500 font-mono">llama-3.3-70b</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
        {messages.length === 0 && (
          <div className="text-xs text-gray-500 leading-relaxed">
            Ask clarifying questions. I'll help you reason through the problem, but I won't hand you the solution.
          </div>
        )}
        {messages.map((m, idx) => (
          <div key={idx}>
            <div className={`text-[10px] uppercase tracking-widest mb-1 ${m.role === 'user' ? 'text-gray-500' : a.text}`}>
              {m.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className={`rounded-md p-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-bg-700 text-gray-200' : 'bg-bg-900 border border-bg-600 text-gray-100'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="spinner w-3 h-3" /> thinking...
          </div>
        )}
        {error && <div className="text-xs text-red-400">{error}</div>}
      </div>

      <div className="border-t border-bg-600 p-2 flex-shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          rows={3}
          placeholder="Ask a question... (⌘/Ctrl+Enter to send)"
          className="w-full bg-bg-900 border border-bg-600 rounded-md px-2 py-1.5 text-sm resize-none focus:outline-none focus:border-gray-400"
        />
        <div className="flex items-center mt-1.5">
          <div className="text-[10px] text-gray-500">⌘/Ctrl+Enter</div>
          <div className="flex-1" />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className={`px-3 py-1 ${a.bg} ${a.hover} text-white rounded text-xs font-medium disabled:opacity-40`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
