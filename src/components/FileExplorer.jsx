import React from 'react';

export default function FileExplorer({ files, activeFile, onPick, dirtyFiles, domain }) {
  return (
    <div className="h-full bg-bg-800 border-r border-bg-600 flex flex-col">
      <div className="px-3 py-2 border-b border-bg-600 flex-shrink-0">
        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
          Explorer
        </div>
        {domain && (
          <div className="text-xs text-gray-400 mt-1 line-clamp-2" title={domain}>
            {domain}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((f) => {
          const isActive = f.name === activeFile;
          const isDirty = dirtyFiles.has(f.name);
          return (
            <button
              key={f.name}
              onClick={() => onPick(f.name)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-bg-700 transition-colors ${
                isActive ? 'bg-bg-700 text-white' : 'text-gray-300'
              }`}
            >
              <span className="text-xs">{f.name.endsWith('.py') ? '🐍' : '📄'}</span>
              <span className="truncate flex-1 font-mono text-[12px]">{f.name}</span>
              {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
