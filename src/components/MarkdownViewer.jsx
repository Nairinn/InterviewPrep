import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Read-only markdown view used for problem documentation (README.md, tickets/*.md).
// Distinct from the chat-sidebar markdown component — this version targets the
// editor pane (wider, larger type, more breathing room).
const components = {
  h1: ({ node, ...p }) => <h1 className="text-2xl font-bold text-white mt-6 mb-3 pb-2 border-b border-bg-600" {...p} />,
  h2: ({ node, ...p }) => <h2 className="text-xl font-semibold text-white mt-6 mb-2" {...p} />,
  h3: ({ node, ...p }) => <h3 className="text-base font-semibold text-gray-100 mt-4 mb-2" {...p} />,
  p: ({ node, ...p }) => <p className="my-3 leading-relaxed text-gray-200" {...p} />,
  ul: ({ node, ...p }) => <ul className="list-disc pl-6 my-3 space-y-1 text-gray-200" {...p} />,
  ol: ({ node, ...p }) => <ol className="list-decimal pl-6 my-3 space-y-1 text-gray-200" {...p} />,
  li: ({ node, ...p }) => <li className="leading-relaxed" {...p} />,
  strong: ({ node, ...p }) => <strong className="font-semibold text-white" {...p} />,
  em: ({ node, ...p }) => <em className="italic" {...p} />,
  a: ({ node, ...p }) => (
    <a className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noreferrer" {...p} />
  ),
  hr: () => <hr className="my-4 border-bg-600" />,
  blockquote: ({ node, ...p }) => (
    <blockquote className="border-l-4 border-bg-600 pl-4 my-3 text-gray-300 italic" {...p} />
  ),
  code: ({ inline, className, children, ...rest }) => {
    if (inline) {
      return (
        <code className="bg-bg-700 text-gray-100 px-1.5 py-0.5 rounded text-[12.5px] font-mono">
          {children}
        </code>
      );
    }
    return (
      <pre className="bg-bg-900 border border-bg-600 rounded-md p-3 my-3 overflow-x-auto text-[12.5px] font-mono leading-relaxed">
        <code {...rest}>{children}</code>
      </pre>
    );
  },
  table: ({ node, ...p }) => (
    <div className="my-3 overflow-x-auto">
      <table className="border-collapse text-[13px]" {...p} />
    </div>
  ),
  th: ({ node, ...p }) => (
    <th className="border border-bg-600 px-3 py-1.5 bg-bg-700 text-left font-semibold" {...p} />
  ),
  td: ({ node, ...p }) => <td className="border border-bg-600 px-3 py-1.5" {...p} />,
};

export default function MarkdownViewer({ content }) {
  return (
    <div className="h-full overflow-y-auto bg-bg-900 px-8 py-6">
      <div className="max-w-3xl mx-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content || ''}
        </ReactMarkdown>
      </div>
    </div>
  );
}
