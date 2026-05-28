import React, { useState } from 'react';
import { accentClasses, formatTime } from '../utils/format.js';

export default function CheckpointDrawer({ checkpoint, accent, elapsed, onComplete, allComplete }) {
  const a = accentClasses(accent);
  const [open, setOpen] = useState(true);

  if (!checkpoint) return null;

  return (
    <div className={`border-b border-bg-600 ${a.bgSoft}`}>
      <div className="flex items-center px-4 py-2 text-sm">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-gray-300 hover:text-white"
        >
          <span className="text-xs">{open ? '▼' : '▶'}</span>
          <span className={`text-xs ${a.text} font-semibold`}>
            CHECKPOINT {checkpoint.id} / 4
          </span>
          <span className="font-medium text-gray-200">{checkpoint.title}</span>
          {!checkpoint.ai_enabled && (
            <span className="ml-2 px-1.5 py-0.5 bg-bg-700 rounded text-[10px] text-gray-400 font-mono">
              🔒 AI DISABLED
            </span>
          )}
        </button>
        <div className="flex-1" />
        <div className="text-xs text-gray-400 font-mono mr-3">{formatTime(elapsed)}</div>
        {!checkpoint.complete && !allComplete && (
          <button
            onClick={onComplete}
            className={`px-3 py-1 ${a.bg} ${a.hover} text-white rounded text-xs font-medium`}
          >
            Mark Complete
          </button>
        )}
        {checkpoint.complete && (
          <div className={`px-3 py-1 bg-bg-700 ${a.text} rounded text-xs font-medium`}>
            ✓ Complete
          </div>
        )}
      </div>
      {open && (
        <div className="px-4 pb-3 text-sm text-gray-300 leading-relaxed animate-slideIn">
          {checkpoint.task}
        </div>
      )}
    </div>
  );
}
