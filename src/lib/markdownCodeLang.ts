/** Normaliza alias de linguagem em fences markdown (```py → python). */
const ALIASES: Record<string, string> = {
  py: 'python',
  python3: 'python',
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  shellsession: 'shell',
  yml: 'yaml',
  md: 'markdown',
  rs: 'rust',
  rb: 'ruby',
  kt: 'kotlin',
  cpp: 'cpp',
  'c++': 'cpp',
  cs: 'java',
  csharp: 'java',
  ps1: 'powershell',
  docker: 'dockerfile',
  jsonc: 'json',
  text: 'text',
  plaintext: 'text',
  txt: 'text',
}

const LABELS: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  json: 'JSON',
  css: 'CSS',
  html: 'HTML',
  markdown: 'Markdown',
  rust: 'Rust',
  go: 'Go',
  java: 'Java',
  kotlin: 'Kotlin',
  cpp: 'C++',
  c: 'C',
  php: 'PHP',
  ruby: 'Ruby',
  swift: 'Swift',
  sql: 'SQL',
  yaml: 'YAML',
  xml: 'XML',
  shell: 'Shell',
  powershell: 'PowerShell',
  dockerfile: 'Dockerfile',
  toml: 'TOML',
  lua: 'Lua',
  r: 'R',
  ini: 'INI',
  text: 'Código',
}

export function languageFromMarkdownClass(className?: string): string | null {
  if (!className) return null
  const m = /\blanguage-([\w+#-]+)/i.exec(className)
  if (!m) return null
  return normalizeMarkdownLanguage(m[1])
}

export function normalizeMarkdownLanguage(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/^language-/, '')
  return ALIASES[key] ?? key
}

export function languageLabel(languageId: string): string {
  return LABELS[languageId] ?? languageId.charAt(0).toUpperCase() + languageId.slice(1)
}

/** Heurística leve quando o modelo omite o idioma no fence. */
export function detectCodeLanguage(code: string): string {
  const sample = code.slice(0, 1200).trim()
  if (!sample) return 'text'

  if (
    /^\s*#!.*\b(python|bash|sh)\b/m.test(sample) ||
    /\b(def |class |import |from .+ import|print\(|async def )/.test(sample)
  ) {
    return 'python'
  }
  if (
    /\b(function |const |let |var |=>|export default|import .+ from )/.test(sample) ||
    /console\.(log|error)\(/.test(sample)
  ) {
    return 'javascript'
  }
  if (/\b(interface |type |: string|: number|as const)/.test(sample)) {
    return 'typescript'
  }
  if (/^\s*<\?php\b/m.test(sample) || /\b<\?php/.test(sample)) {
    return 'php'
  }
  if (/\b(fn |impl |pub fn |use std::)/.test(sample)) {
    return 'rust'
  }
  if (/^\s*package \w+/m.test(sample) || /\bfunc \w+\(/.test(sample)) {
    return 'go'
  }
  if (/^\s*#\s/.test(sample) && sample.split('\n').filter((l) => l.startsWith('#')).length > 2) {
    return 'markdown'
  }
  if (/^\s*\{[\s\S]*"[\w-]+"\s*:/m.test(sample) || /^\s*\[[\s\S]*\{/.test(sample)) {
    return 'json'
  }
  if (/^\s*SELECT\b/im.test(sample) || /\bFROM\b[\s\S]+\bWHERE\b/i.test(sample)) {
    return 'sql'
  }
  if (/^\s*---\s*$/m.test(sample) || /:\s*\S+\s*$/m.test(sample)) {
    return 'yaml'
  }
  if (/<[a-z][\s\S]*>/i.test(sample) && /<\/[a-z]+>/i.test(sample)) {
    return 'html'
  }
  if (/\b@echo off\b/i.test(sample) || /^\s*REM\s/im.test(sample)) {
    return 'shell'
  }

  return 'text'
}

export function resolveCodeLanguage(
  code: string,
  className?: string,
): string {
  return languageFromMarkdownClass(className) ?? detectCodeLanguage(code)
}
