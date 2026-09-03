import React from 'react'
import Prism from 'prismjs'

// Core & common language grammars
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-docker'
import 'prismjs/components/prism-graphql'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-diff'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-protobuf'
import 'prismjs/components/prism-toml'
import 'prismjs/components/prism-ini'

export const LANGUAGE_ALIASES = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  python3: 'python',
  golang: 'go',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cs: 'csharp',
  csharp: 'csharp',
  rs: 'rust',
  rust: 'rust',
  rb: 'ruby',
  ruby: 'ruby',
  kt: 'kotlin',
  kotlin: 'kotlin',
  swift: 'swift',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  json: 'json',
  jsonc: 'json',
  sql: 'sql',
  pgsql: 'sql',
  mysql: 'sql',
  docker: 'docker',
  dockerfile: 'docker',
  gql: 'graphql',
  graphql: 'graphql',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  css: 'css',
  md: 'markdown',
  markdown: 'markdown',
  diff: 'diff',
  proto: 'protobuf',
  protobuf: 'protobuf',
  toml: 'toml',
  ini: 'ini',
}

export const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  python: 'Python',
  java: 'Java',
  go: 'Go',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  rust: 'Rust',
  sql: 'SQL',
  json: 'JSON',
  yaml: 'YAML',
  bash: 'Bash',
  docker: 'Docker',
  graphql: 'GraphQL',
  markup: 'HTML / XML',
  css: 'CSS',
  markdown: 'Markdown',
  diff: 'Diff',
  kotlin: 'Kotlin',
  swift: 'Swift',
  ruby: 'Ruby',
  protobuf: 'Protobuf',
  toml: 'TOML',
  ini: 'INI',
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default function CodeBlock({ language, code }) {
  const [copied, setCopied] = React.useState(false)
  const normalizedLang = LANGUAGE_ALIASES[language?.toLowerCase()] || language?.toLowerCase() || ''
  const displayLabel = LANGUAGE_LABELS[normalizedLang] || (normalizedLang ? normalizedLang.toUpperCase() : 'CODE')

  const highlightedHtml = React.useMemo(() => {
    const rawCode = String(code ?? '').replace(/\n$/, '')
    const grammar = Prism.languages[normalizedLang]
    if (grammar) {
      try {
        return Prism.highlight(rawCode, grammar, normalizedLang)
      } catch {
        return escapeHtml(rawCode)
      }
    }
    return escapeHtml(rawCode)
  }, [code, normalizedLang])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(code ?? '').replace(/\n$/, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="notes-code-block-card">
      <div className="notes-code-block-header">
        <div className="notes-code-block-lang">
          <span className="notes-code-block-dot" aria-hidden="true" />
          <span>{displayLabel}</span>
        </div>
        <button
          type="button"
          className={`notes-code-action-icon-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          aria-label={copied ? 'Copied code' : 'Copy code to clipboard'}
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="m4 10 4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
      <div className="notes-code-block-body">
        <pre className={`language-${normalizedLang || 'none'}`}>
          <code
            className={`language-${normalizedLang || 'none'}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  )
}
