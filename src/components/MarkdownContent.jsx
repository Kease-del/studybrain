import { useState } from "react"
import { Copy, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"

function CodeBlock({ className, children, ...props }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const code = String(children).replace(/\n$/, "")
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      toast.success("Code copied")
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="group/code relative my-4 first:mt-0 last:mb-0">
      <div className="overflow-x-auto rounded-xl border bg-background/60 [scrollbar-width:thin]">
        <pre className="p-4 text-[13px] leading-relaxed [overflow-wrap:normal]">
          <code
            className={cn(
              "font-mono text-[0.95em] text-foreground/90",
              className
            )}
            {...props}
          >
            {children}
          </code>
        </pre>
      </div>
      <button
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 rounded-md border bg-background/80 p-1.5 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground md:opacity-0 md:group-hover/code:opacity-100"
        title="Copy code"
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}

const ALIGN = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

const MARKDOWN_COMPONENTS = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-words font-medium text-blue-600 underline-offset-2 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) =>
    className ? (
      <CodeBlock className={className} {...props}>
        {children}
      </CodeBlock>
    ) : (
      <code
        className="rounded-md bg-primary/10 px-[0.35em] py-[0.15em] font-mono text-[0.85em] leading-normal text-foreground/90 ring-1 ring-black/5 dark:ring-white/10"
        {...props}
      >
        {children}
      </code>
    ),
  h1: ({ children }) => (
    <h1 className="mb-3 mt-7 text-[1.45em] font-semibold tracking-tight first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2.5 mt-6 text-[1.3em] font-semibold tracking-tight first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-[1.15em] font-semibold tracking-tight first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-4 text-[1.05em] font-semibold tracking-tight first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-[1.75] last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-1.5 pl-6 marker:text-muted-foreground/50 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-1.5 pl-6 marker:text-muted-foreground/50 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-[1.7] [&>p]:mb-1 [&>p]:last:mb-0">{children}</li>
  ),
  hr: () => <hr className="my-8 border-t border-muted-foreground/15" />,
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-lg border-l-[3px] border-l-primary/40 bg-primary/5 py-2.5 pr-4 pl-4 first:mt-0 last:mb-0">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border first:mt-0 last:mb-0">
      <table className="w-full min-w-full border-collapse text-[0.9em] leading-relaxed">
        {children}
      </table>
    </div>
  ),
  th: ({ align, children }) => (
    <th
      className={cn(
        "bg-muted/60 px-4 py-2.5 font-semibold whitespace-nowrap",
        ALIGN[align ?? "left"]
      )}
    >
      {children}
    </th>
  ),
  td: ({ align, children }) => (
    <td className={cn("px-4 py-2.5 align-top", ALIGN[align ?? "left"])}>
      {children}
    </td>
  ),
  input: ({ checked }) => (
    <input
      type="checkbox"
      checked={checked}
      readOnly
      className="mt-1 h-4 w-4 shrink-0 accent-primary"
    />
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => (
    <del className="text-muted-foreground/70">{children}</del>
  ),
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      className="my-4 h-auto max-w-full rounded-lg border bg-background/40 first:mt-0 last:mb-0"
    />
  ),
}

export default function MarkdownContent({ children }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={MARKDOWN_COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
