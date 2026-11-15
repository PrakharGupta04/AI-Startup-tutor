import React from "react";
import ReactMarkdown from "react-markdown";

export interface MarkdownProps {
  children: string;
  className?: string;
}

function sanitizeProps<T extends object>(props: T): Omit<T, "node"> {
  const copy = { ...props } as T & { node?: unknown };
  delete copy.node;
  return copy;
}

export function Markdown({ children, className = "" }: MarkdownProps) {
  return (
    <div className={`text-slate-800 text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        components={{
          h1: (props) => (
            <h1
              className="text-xl font-bold text-slate-900 mt-4 mb-2"
              {...sanitizeProps(props)}
            />
          ),
          h2: (props) => (
            <h2
              className="text-lg font-bold text-slate-900 mt-3 mb-2"
              {...sanitizeProps(props)}
            />
          ),
          h3: (props) => (
            <h3
              className="text-base font-semibold text-slate-900 mt-2 mb-1"
              {...sanitizeProps(props)}
            />
          ),
          p: (props) => (
            <p
              className="mb-3 last:mb-0 leading-relaxed"
              {...sanitizeProps(props)}
            />
          ),
          ul: (props) => (
            <ul
              className="list-disc list-inside mb-3 space-y-1 pl-1"
              {...sanitizeProps(props)}
            />
          ),
          ol: (props) => (
            <ol
              className="list-decimal list-inside mb-3 space-y-1 pl-1"
              {...sanitizeProps(props)}
            />
          ),
          li: (props) => (
            <li className="leading-relaxed" {...sanitizeProps(props)} />
          ),
          strong: (props) => (
            <strong
              className="font-semibold text-slate-900"
              {...sanitizeProps(props)}
            />
          ),
          em: (props) => (
            <em className="italic" {...sanitizeProps(props)} />
          ),
          blockquote: (props) => (
            <blockquote
              className="border-l-4 border-slate-300 pl-4 italic text-slate-700 my-2"
              {...sanitizeProps(props)}
            />
          ),
          code: (props) => (
            <code
              className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-200"
              {...sanitizeProps(props)}
            />
          ),
          pre: (props) => (
            <pre
              className="bg-slate-100 p-3 rounded-md overflow-x-auto text-xs font-mono my-2 border border-slate-200"
              {...sanitizeProps(props)}
            />
          ),
          a: ({ href, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800 transition-colors"
              {...sanitizeProps(props)}
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
