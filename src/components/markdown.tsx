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
    <div className={`text-ink text-[15px] leading-relaxed ${className}`}>
      <ReactMarkdown
        components={{
          h1: (props) => (
            <h1
              className="text-xl font-semibold text-ink mt-4 mb-2 tracking-tight"
              {...sanitizeProps(props)}
            />
          ),
          h2: (props) => (
            <h2
              className="text-lg font-semibold text-ink mt-3 mb-2 tracking-tight"
              {...sanitizeProps(props)}
            />
          ),
          h3: (props) => (
            <h3
              className="text-base font-semibold text-ink mt-2 mb-1"
              {...sanitizeProps(props)}
            />
          ),
          p: (props) => (
            <p
              className="mb-3 last:mb-0 leading-relaxed text-ink"
              {...sanitizeProps(props)}
            />
          ),
          ul: (props) => (
            <ul
              className="list-disc list-inside mb-3 space-y-1 pl-1 text-ink"
              {...sanitizeProps(props)}
            />
          ),
          ol: (props) => (
            <ol
              className="list-decimal list-inside mb-3 space-y-1 pl-1 text-ink"
              {...sanitizeProps(props)}
            />
          ),
          li: (props) => (
            <li className="leading-relaxed text-ink" {...sanitizeProps(props)} />
          ),
          strong: (props) => (
            <strong
              className="font-semibold text-ink"
              {...sanitizeProps(props)}
            />
          ),
          em: (props) => (
            <em className="italic" {...sanitizeProps(props)} />
          ),
          blockquote: (props) => (
            <blockquote
              className="border-l-4 border-line pl-4 italic text-ink-muted my-2"
              {...sanitizeProps(props)}
            />
          ),
          code: (props) => (
            <code
              className="bg-canvas text-ink px-1.5 py-0.5 rounded font-mono text-xs border border-line"
              {...sanitizeProps(props)}
            />
          ),
          pre: (props) => (
            <pre
              className="bg-canvas p-3 rounded-md overflow-x-auto text-xs font-mono my-2 border border-line text-ink"
              {...sanitizeProps(props)}
            />
          ),
          a: ({ href, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline hover:opacity-80 transition-opacity font-medium"
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
