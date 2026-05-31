import React, { useMemo, useState } from 'react';

// Two-level file tree: top-level files + one level of folders (e.g. tickets/).
// Anything containing more slashes than that still renders, just under its first
// path segment.

function iconFor(name) {
  if (name.endsWith('.py')) return '🐍';
  if (name.endsWith('.md')) return '📘';
  if (name.endsWith('.txt')) return '📄';
  if (name.endsWith('.json')) return '🔧';
  return '📄';
}

function basename(path) {
  const idx = path.lastIndexOf('/');
  return idx >= 0 ? path.slice(idx + 1) : path;
}

function buildTree(files) {
  const roots = []; // top-level files (no slash)
  const folders = new Map(); // folder name -> array of files
  for (const f of files) {
    const slash = f.name.indexOf('/');
    if (slash === -1) {
      roots.push(f);
    } else {
      const folder = f.name.slice(0, slash);
      if (!folders.has(folder)) folders.set(folder, []);
      folders.get(folder).push(f);
    }
  }
  return { roots, folders };
}

// Stable ordering: README first, main.py next, then *.py, then *.txt, then rest.
function sortRoots(files) {
  const score = (n) => {
    if (n === 'README.md') return 0;
    if (n === 'main.py') return 1;
    if (n === 'expected_output.txt') return 2;
    if (n === 'test_solution.py') return 9; // last
    if (n.endsWith('.py')) return 3;
    if (n.endsWith('.md')) return 4;
    if (n.endsWith('.txt')) return 5;
    return 6;
  };
  return [...files].sort((a, b) => {
    const sa = score(a.name);
    const sb = score(b.name);
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name);
  });
}

export default function FileExplorer({ files, activeFile, onPick, dirtyFiles, domain }) {
  const { roots, folders } = useMemo(() => buildTree(files), [files]);
  const sortedRoots = useMemo(() => sortRoots(roots), [roots]);

  // Folders default to open
  const [openFolders, setOpenFolders] = useState(() => {
    const s = new Set();
    for (const folder of folders.keys()) s.add(folder);
    return s;
  });

  function toggleFolder(folder) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  }

  function FileRow({ file, depth = 0 }) {
    const isActive = file.name === activeFile;
    const isDirty = dirtyFiles.has(file.name);
    const label = basename(file.name);
    return (
      <button
        key={file.name}
        onClick={() => onPick(file.name)}
        className={`w-full flex items-center gap-2 py-1.5 text-sm text-left hover:bg-bg-700 transition-colors ${
          isActive ? 'bg-bg-700 text-white' : 'text-gray-300'
        }`}
        style={{ paddingLeft: 12 + depth * 14, paddingRight: 12 }}
      >
        <span className="text-xs">{iconFor(file.name)}</span>
        <span className="truncate flex-1 font-mono text-[12px]">{label}</span>
        {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
      </button>
    );
  }

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
        {sortedRoots.map((f) => (
          <FileRow key={f.name} file={f} />
        ))}
        {[...folders.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([folder, folderFiles]) => {
          const open = openFolders.has(folder);
          const sorted = [...folderFiles].sort((a, b) => a.name.localeCompare(b.name));
          return (
            <div key={folder}>
              <button
                onClick={() => toggleFolder(folder)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-bg-700 transition-colors text-gray-300"
              >
                <span className="text-[10px] w-3 text-gray-500">{open ? '▾' : '▸'}</span>
                <span className="text-xs">📁</span>
                <span className="truncate flex-1 font-mono text-[12px]">{folder}/</span>
              </button>
              {open &&
                sorted.map((f) => <FileRow key={f.name} file={f} depth={1} />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
