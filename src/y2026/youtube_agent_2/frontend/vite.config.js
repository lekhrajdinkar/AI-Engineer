import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { NOTE_REPOSITORIES } from './src/config/noteRepositories.js'

const frontendDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultCheckoutRoot = path.resolve(frontendDirectory, '../../../../..')

function displayTitle(filePath) {
  const filename = path.basename(filePath).replace(/\.(md|markdown)$/i, '')
  return filename.replace(/^\d+[_. -]*/, '').replace(/[_-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase()) || filename
}

function localNotesPlugin(configuredCheckoutRoot) {
  const checkoutRoot = path.resolve(configuredCheckoutRoot || process.env.LOCAL_NOTES_ROOT || defaultCheckoutRoot)
  const checkouts = new Map(NOTE_REPOSITORIES.map(repository => [repository.id, {
    repository,
    root: path.resolve(checkoutRoot, repository.localRepo || repository.repo),
  }]))

  const availableCheckout = async repositoryId => {
    const checkout = checkouts.get(repositoryId)
    if (!checkout) return null
    const docsRoot = path.resolve(checkout.root, checkout.repository.path)
    try {
      if (!(await fs.stat(docsRoot)).isDirectory()) return null
      return { ...checkout, docsRoot }
    } catch {
      return null
    }
  }

  const walkMarkdown = async (directory, rootDir, files = []) => {
    const ignoredDirs = new Set(['.git', 'node_modules', 'target', 'build', '.idea', '.vscode', '.gradle', 'dist', '.bin'])
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          await walkMarkdown(path.join(directory, entry.name), rootDir, files)
        }
      } else if (/\.(md|markdown)$/i.test(entry.name) && !entry.name.replace(/\.(md|markdown)$/i, '').toLowerCase().endsWith('__x')) {
        const relativePath = path.relative(rootDir, path.join(directory, entry.name)).split(path.sep).join('/')
        const stats = await fs.stat(path.join(directory, entry.name))
        files.push({ relativePath, size: stats.size })
      }
    }
    return files
  }

  const json = (response, status, payload) => {
    response.statusCode = status
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    response.end(JSON.stringify(payload))
  }

  return {
    name: 'local-learning-notes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(request.url || '/', 'http://localhost')
        if (!requestUrl.pathname.startsWith('/local-notes/')) return next()
        try {
          if (requestUrl.pathname === '/local-notes/status') {
            const available = []
            for (const repository of NOTE_REPOSITORIES) {
              if (await availableCheckout(repository.id)) available.push(repository.id)
            }
            return json(response, 200, { available })
          }

          const rawMatch = requestUrl.pathname.match(/^\/local-notes\/([^/]+)\/raw\/(.+)$/)
          const match = requestUrl.pathname.match(/^\/local-notes\/([^/]+)\/(index|content)$/)
          if (rawMatch) {
            const repositoryId = decodeURIComponent(rawMatch[1])
            const checkout = await availableCheckout(repositoryId)
            if (!checkout) return json(response, 404, { error: 'This repository is not checked out under the configured local root.' })
            const requestedPath = decodeURIComponent(rawMatch[2]).replaceAll('\\', '/')
            const repositoryPrefix = checkout.repository.path.replace(/^\/+|\/+$/g, '')
            const relativePath = requestedPath.startsWith(`${repositoryPrefix}/`) ? requestedPath.slice(repositoryPrefix.length + 1) : requestedPath

            // Try resolving from repository root (supports src/**, draw/**, etc.) first, then fallback to docsRoot
            let resolvedPath = path.resolve(checkout.root, requestedPath)
            const rootPrefix = `${checkout.root}${path.sep}`
            let isValid = resolvedPath === checkout.root || resolvedPath.startsWith(rootPrefix)

            try {
              const stat = await fs.stat(resolvedPath)
              if (!stat.isFile()) isValid = false
            } catch {
              isValid = false
            }

            if (!isValid) {
              resolvedPath = path.resolve(checkout.docsRoot, relativePath)
              const docsRootPrefix = `${checkout.docsRoot}${path.sep}`
              isValid = resolvedPath === checkout.docsRoot || resolvedPath.startsWith(docsRootPrefix)
            }

            if (!isValid) return json(response, 403, { error: 'Local asset path is outside the configured repository directory.' })

            const contentTypes = {
              '.md': 'text/markdown; charset=utf-8',
              '.markdown': 'text/markdown; charset=utf-8',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.gif': 'image/gif',
              '.svg': 'image/svg+xml',
              '.webp': 'image/webp',
              '.py': 'text/plain; charset=utf-8',
              '.js': 'text/plain; charset=utf-8',
              '.jsx': 'text/plain; charset=utf-8',
              '.ts': 'text/plain; charset=utf-8',
              '.tsx': 'text/plain; charset=utf-8',
              '.json': 'application/json; charset=utf-8',
              '.yaml': 'text/plain; charset=utf-8',
              '.yml': 'text/plain; charset=utf-8',
              '.sh': 'text/plain; charset=utf-8',
              '.sql': 'text/plain; charset=utf-8',
              '.ipynb': 'application/json; charset=utf-8',
              '.excalidraw': 'application/json; charset=utf-8',
            }

            try {
              const content = await fs.readFile(resolvedPath)
              response.statusCode = 200
              response.setHeader('Content-Type', contentTypes[path.extname(resolvedPath).toLowerCase()] || 'text/plain; charset=utf-8')
              response.setHeader('Cache-Control', 'no-store')
              return response.end(content)
            } catch (err) {
              return json(response, 404, { error: `File not found: ${requestedPath}` })
            }
          }
          if (!match) return json(response, 404, { error: 'Local notes endpoint not found.' })
          const repositoryId = decodeURIComponent(match[1])
          const checkout = await availableCheckout(repositoryId)
          if (!checkout) return json(response, 404, { error: 'This repository is not checked out under the configured local root.' })

          if (match[2] === 'index') {
            const files = await walkMarkdown(checkout.root, checkout.root)
            const repositoryPrefix = checkout.repository.path.replace(/^\/+|\/+$/g, '')
            const allNotes = files.map(file => {
              return {
                path: file.relativePath,
                title: displayTitle(file.relativePath),
                folder: file.relativePath.split('/').slice(0, -1).join('/'),
                size: file.size,
                sha: '',
                github_url: `https://github.com/${checkout.repository.owner}/${checkout.repository.repo}/blob/${checkout.repository.branch}/${file.relativePath}`,
              }
            }).sort((left, right) => left.path.localeCompare(right.path, undefined, { numeric: true }))

            const notes = allNotes.filter(item => item.path.startsWith(`${repositoryPrefix}/`))
            return json(response, 200, { notes, allNotes })
          }

          const requestedPath = (requestUrl.searchParams.get('path') || '').replaceAll('\\', '/')
          const repositoryPrefix = checkout.repository.path.replace(/^\/+|\/+$/g, '')
          const relativePath = requestedPath.startsWith(`${repositoryPrefix}/`) ? requestedPath.slice(repositoryPrefix.length + 1) : requestedPath

          let resolvedPath = path.resolve(checkout.root, requestedPath)
          const rootPrefix = `${checkout.root}${path.sep}`
          let isValid = resolvedPath === checkout.root || resolvedPath.startsWith(rootPrefix)
          let exists = false

          const checkFileOrDirectory = async (filePath) => {
            try {
              const stat = await fs.stat(filePath)
              if (stat.isDirectory()) {
                for (const candidate of ['README.md', 'readme.md', 'index.md', 'README.markdown']) {
                  const candidatePath = path.join(filePath, candidate)
                  try {
                    const cStat = await fs.stat(candidatePath)
                    if (cStat.isFile()) return candidatePath
                  } catch {}
                }
              } else if (stat.isFile()) {
                return filePath
              }
            } catch {}
            return null
          }

          const matchedRootPath = await checkFileOrDirectory(resolvedPath)
          if (matchedRootPath) {
            resolvedPath = matchedRootPath
            exists = true
          }

          if (!exists) {
            const resolvedDocsPath = path.resolve(checkout.docsRoot, relativePath)
            const docsRootPrefix = `${checkout.docsRoot}${path.sep}`
            if (resolvedDocsPath === checkout.docsRoot || resolvedDocsPath.startsWith(docsRootPrefix)) {
              const matchedDocsPath = await checkFileOrDirectory(resolvedDocsPath)
              if (matchedDocsPath) {
                resolvedPath = matchedDocsPath
                isValid = true
                exists = true
              }
            }
          }

          if (!isValid) return json(response, 403, { error: 'Local note path is outside the configured repository directory.' })
          if (!exists) return json(response, 404, { error: `Local note not found: ${requestedPath}` })
          if (!/\.(md|markdown)$/i.test(resolvedPath)) return json(response, 400, { error: 'Only Markdown notes can be read.' })
          const content = await fs.readFile(resolvedPath, 'utf8')
          response.statusCode = 200
          response.setHeader('Content-Type', 'text/markdown; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          return response.end(content)
        } catch (error) {
          return json(response, error?.code === 'ENOENT' ? 404 : 500, { error: error?.message || 'Unable to read local notes.' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, frontendDirectory, '')
  return {
    plugins: [react(), localNotesPlugin(environment.LOCAL_NOTES_ROOT)],
    optimizeDeps: {
      include: ['pako'],
    },
    server: {
      port: 5173,
      proxy: {
        '/auth': {
          target: 'http://127.0.0.1:8001',
          changeOrigin: true,
        },
        '/api': {
          target: 'http://127.0.0.1:8001',
          changeOrigin: true,
        },
        '/public-api': {
          target: 'http://127.0.0.1:8001',
          changeOrigin: true,
        },
      },
    },
  }
})
