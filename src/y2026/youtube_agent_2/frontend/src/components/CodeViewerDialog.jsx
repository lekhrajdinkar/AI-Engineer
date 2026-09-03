import React from 'react'
import Prism from 'prismjs'
import { LANGUAGE_ALIASES, LANGUAGE_LABELS, escapeHtml } from './CodeBlock'

export default function CodeViewerDialog({ modal, onClose }) {
  const [copied, setCopied] = React.useState(false)
  const scrollRef = React.useRef(null)

  React.useEffect(() => {
    if (!modal) return undefined
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [modal, onClose])

  const targetStart = modal?.startLine
  const targetEnd = modal?.endLine

  React.useEffect(() => {
    if (!modal) return undefined
    if (targetStart && targetStart > 1) {
      const timer = setTimeout(() => {
        const lineEl = document.getElementById(`code-dialog-line-${targetStart}`)
        if (lineEl && scrollRef.current) {
          lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 120)
      return () => clearTimeout(timer)
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [modal, targetStart])

  if (!modal) return null

  const { title, path, url, code, language, totalLines } = modal
  const normalizedLang = LANGUAGE_ALIASES[language?.toLowerCase()] || language?.toLowerCase() || ''
  const displayLabel = LANGUAGE_LABELS[normalizedLang] || (normalizedLang ? normalizedLang.toUpperCase() : 'CODE')

  const lines = (code || '').split(/\r?\n/)

  const highlightedHtml = (() => {
    const raw = String(code ?? '').replace(/\n$/, '')
    const grammar = Prism.languages[normalizedLang]
    if (grammar) {
      try {
        return Prism.highlight(raw, grammar, normalizedLang)
      } catch {
        return escapeHtml(raw)
      }
    }
    return escapeHtml(raw)
  })()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(code ?? '').replace(/\n$/, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  // Convert raw GitHub URL to browseable blob URL if applicable
  const githubBlobUrl = (() => {
    if (!url) return null
    try {
      const parsed = new URL(url)
      if (parsed.hostname === 'raw.githubusercontent.com') {
        const parts = parsed.pathname.split('/').filter(Boolean)
        if (parts.length >= 3) {
          const owner = parts[0]
          const repo = parts[1]
          const branch = parts[2]
          const rest = parts.slice(3).join('/')
          return `https://github.com/${owner}/${repo}/blob/${branch}/${rest}`
        }
      }
    } catch {}
    return url
  })()

  return (
    <div
      className="code-dialog-backdrop"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}
      role="presentation"
    >
      <section
        className="code-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Source Code: ${title}`}
      >
        <header className="code-dialog-header">
          <div className="code-dialog-brand">
            <span className="code-dialog-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
            </span>
            <div className="code-dialog-title-group">
              <div className="code-dialog-tags">
                <span className="code-dialog-lang-tag">{displayLabel}</span>
                <span className="code-dialog-lines-tag">{totalLines || lines.length} lines</span>
                {targetStart && (
                  <span className="code-dialog-jump-tag">
                    Jumped to Line {targetStart}
                  </span>
                )}
              </div>
              <strong title={path || title}>{title}</strong>
              {path && path !== title && <small title={path}>{path}</small>}
            </div>
          </div>

          <div className="code-dialog-actions">
            <button
              type="button"
              className={`code-dialog-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              aria-label={copied ? 'Copied code' : 'Copy code to clipboard'}
              title={copied ? 'Copied!' : 'Copy entire file'}
            >
              {copied ? (
                <>
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="m4 10 4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Copy Full File</span>
                </>
              )}
            </button>

            {githubBlobUrl && (
              <a
                href={githubBlobUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="code-dialog-open-tab-btn"
                title="Open file on GitHub"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                </svg>
                <span>Open in GitHub ↗</span>
              </a>
            )}

            <button
              type="button"
              className="code-dialog-close"
              onClick={onClose}
              aria-label="Close code dialog"
              title="Close (Esc)"
            >
              ×
            </button>
          </div>
        </header>

        <div className="code-dialog-stage">
          <div className="code-dialog-scroll" ref={scrollRef}>
            <div className="notes-code-embed-body is-dialog">
              <div className="notes-code-gutter" aria-hidden="true">
                {lines.map((_, idx) => {
                  const lineNum = idx + 1
                  const isTargetStart = lineNum === targetStart
                  const isInRange = targetStart && targetEnd
                    ? (lineNum >= targetStart && lineNum <= targetEnd)
                    : (targetStart && !targetEnd ? lineNum >= targetStart : false)
                  return (
                    <span
                      id={`code-dialog-line-${lineNum}`}
                      key={idx}
                      className={`${isTargetStart ? 'is-target-start' : ''} ${isInRange ? 'is-range-highlight' : ''}`}
                    >
                      {lineNum}
                    </span>
                  )
                })}
              </div>
              <pre className={`language-${normalizedLang || 'none'}`}>
                <code
                  className={`language-${normalizedLang || 'none'}`}
                  dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
              </pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
