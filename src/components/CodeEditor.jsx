import React, { useEffect, useMemo, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, keymap } from '@codemirror/view';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { bracketMatching, indentOnInput, foldGutter } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete';
import MarkdownViewer from './MarkdownViewer.jsx';

function basename(p) {
  const i = p.lastIndexOf('/');
  return i >= 0 ? p.slice(i + 1) : p;
}

function iconFor(name) {
  if (name.endsWith('.py')) return '🐍';
  if (name.endsWith('.md')) return '📘';
  if (name.endsWith('.txt')) return '📄';
  return '📄';
}

// Editable code pane built on CodeMirror. .md files are rendered read-only by
// MarkdownViewer (problem documentation should never be edited).
export default function CodeEditor({ files, activeFile, onChange, onTabPick, dirtyFiles }) {
  const wrapRef = useRef(null);
  const viewRef = useRef(null);
  const fileRef = useRef(activeFile);

  useEffect(() => {
    fileRef.current = activeFile;
  }, [activeFile]);

  const activeFileObj = useMemo(
    () => files.find((f) => f.name === activeFile) || null,
    [files, activeFile]
  );
  const isMarkdown = activeFileObj?.name?.endsWith('.md');

  // Build editor once (only when not in markdown mode)
  useEffect(() => {
    if (!wrapRef.current) return;
    if (isMarkdown) return; // editor unmounted while markdown shows
    if (viewRef.current) return; // already built
    const initialFile = activeFileObj || files[0];
    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      bracketMatching(),
      closeBrackets(),
      indentOnInput(),
      foldGutter(),
      python(),
      oneDark,
      autocompletion({ activateOnTyping: true }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap,
        ...completionKeymap,
        indentWithTab,
      ]),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) {
          const content = u.state.doc.toString();
          onChange(fileRef.current, content);
        }
      }),
      EditorView.theme({
        '&': { height: '100%', backgroundColor: '#0d1117' },
        '.cm-gutters': { backgroundColor: '#0d1117', borderRight: '1px solid #1f2630', color: '#4b5563' },
        '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
        '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.04)' },
      }),
    ];
    const state = EditorState.create({
      doc: initialFile?.content || '',
      extensions,
    });
    const view = new EditorView({ state, parent: wrapRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMarkdown]);

  // Swap doc when active file changes (only when editor is mounted)
  useEffect(() => {
    if (isMarkdown) return;
    const view = viewRef.current;
    if (!view) return;
    const f = activeFileObj;
    if (!f) return;
    const current = view.state.doc.toString();
    if (current === f.content) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: f.content },
    });
  }, [activeFile, isMarkdown, activeFileObj]);

  return (
    <div className="flex flex-col h-full bg-bg-900 min-h-0">
      {/* Tabs */}
      <div className="flex items-center bg-bg-800 border-b border-bg-600 overflow-x-auto flex-shrink-0">
        {files.map((f) => {
          const isActive = f.name === activeFile;
          const isDirty = dirtyFiles.has(f.name);
          return (
            <button
              key={f.name}
              onClick={() => onTabPick(f.name)}
              className={`px-3 py-2 text-xs flex items-center gap-2 border-r border-bg-600 flex-shrink-0 ${
                isActive
                  ? 'bg-bg-900 text-white border-b-2 border-b-blue-500 -mb-px'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-bg-700'
              }`}
              title={f.name}
            >
              <span className="text-[10px]">{iconFor(f.name)}</span>
              <span className="font-mono">{basename(f.name)}</span>
              {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
            </button>
          );
        })}
      </div>
      {/* Body */}
      {isMarkdown ? (
        <div className="flex-1 min-h-0">
          <MarkdownViewer content={activeFileObj?.content || ''} />
        </div>
      ) : (
        <div ref={wrapRef} className="flex-1 overflow-hidden" />
      )}
    </div>
  );
}
