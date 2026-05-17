import type { Extension } from '@codemirror/state'
import { StreamLanguage } from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { php } from '@codemirror/lang-php'
import { xml } from '@codemirror/lang-xml'
import { sql, StandardSQL } from '@codemirror/lang-sql'
import { yaml } from '@codemirror/lang-yaml'
import { go } from '@codemirror/lang-go'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile'
import { toml } from '@codemirror/legacy-modes/mode/toml'
import { lua } from '@codemirror/legacy-modes/mode/lua'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { swift } from '@codemirror/legacy-modes/mode/swift'
import { kotlin } from '@codemirror/legacy-modes/mode/clike'
import { r } from '@codemirror/legacy-modes/mode/r'
import { powerShell } from '@codemirror/legacy-modes/mode/powershell'
import { properties } from '@codemirror/legacy-modes/mode/properties'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function legacyMode(mode: any): Extension {
  return StreamLanguage.define(mode)
}

const cache = new Map<string, Extension>()

/**
 * Extensão CodeMirror por languageId (alinhado com languageFromPath).
 * Usa parsers Lezer quando existem; legacy StreamLanguage para o resto.
 */
export function codemirrorLanguageExtension(languageId: string): Extension {
  const hit = cache.get(languageId)
  if (hit) return hit

  let ext: Extension
  switch (languageId) {
    case 'typescript':
      ext = javascript({ typescript: true })
      break
    case 'javascript':
      ext = javascript()
      break
    case 'jsx':
      ext = javascript({ typescript: true, jsx: true })
      break
    case 'json':
      ext = json()
      break
    case 'css':
    case 'scss':
      ext = css()
      break
    case 'html':
      ext = html()
      break
    case 'markdown':
      ext = markdown()
      break
    case 'python':
      ext = python()
      break
    case 'rust':
      ext = rust()
      break
    case 'java':
      ext = java()
      break
    case 'cpp':
    case 'c':
      ext = cpp()
      break
    case 'php':
      ext = php()
      break
    case 'xml':
      ext = xml()
      break
    case 'sql':
      ext = sql({ dialect: StandardSQL })
      break
    case 'yaml':
      ext = yaml()
      break
    case 'go':
      ext = go()
      break
    case 'shell':
      ext = legacyMode(shell)
      break
    case 'powershell':
      ext = legacyMode(powerShell)
      break
    case 'dockerfile':
      ext = legacyMode(dockerFile)
      break
    case 'toml':
      ext = legacyMode(toml)
      break
    case 'lua':
      ext = legacyMode(lua)
      break
    case 'ruby':
      ext = legacyMode(ruby)
      break
    case 'swift':
      ext = legacyMode(swift)
      break
    case 'kotlin':
      ext = legacyMode(kotlin)
      break
    case 'r':
      ext = legacyMode(r)
      break
    case 'ini':
    case 'properties':
      ext = legacyMode(properties)
      break
    case 'text':
    default:
      ext = []
      break
  }

  cache.set(languageId, ext)
  return ext
}

/** Rótulos para UI (seletor de linguagem futuro). */
export const SUPPORTED_LANGUAGE_IDS = [
  'typescript',
  'javascript',
  'jsx',
  'python',
  'rust',
  'go',
  'java',
  'kotlin',
  'cpp',
  'c',
  'php',
  'ruby',
  'swift',
  'sql',
  'html',
  'css',
  'json',
  'yaml',
  'xml',
  'markdown',
  'shell',
  'powershell',
  'dockerfile',
  'toml',
  'lua',
  'r',
  'ini',
  'text',
] as const
