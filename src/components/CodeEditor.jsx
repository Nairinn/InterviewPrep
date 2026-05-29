import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, keymap } from '@codemirror/view';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { bracketMatching, indentOnInput, foldGutter } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete';

export default function CodeEditor({ files, activeFile, onChange, onTabPick, dirtyFiles }) {
  const wrapRef = useRef(null);
  const viewRef = useRef(null);
  const fileRef = useRef(activeFile);

  // Track active file so the update listener uses the latest value
  useEffect(() => {
    fileRef.current = activeFile;
  }, [activeFile]);

  // Build editor once
  useEffect(() => {
    if (!wrapRef.current) return;
    const initialFile = files.find((f) => f.name === activeFile) || files[0];
    const state = EditorState.create({
      doc: initialFile?.content || '',
      extensions: [
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
      ],
    });
    const view = new EditorView({ state, parent: wrapRef.current });
    viewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap doc when active file changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const f = files.find((x) => x.name === activeFile);
    if (!f) return;
    const current = view.state.doc.toString();
    if (current === f.content) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: f.content },
    });
  }, [activeFile, files]);

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
            >
              <span className="text-[10px]">🐍</span>
              <span className="font-mono">{f.name}</span>
              {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
            </button>
          );
        })}
      </div>
      {/* Editor */}
      <div ref={wrapRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
