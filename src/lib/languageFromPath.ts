/** IDs de linguagem usados pelo editor e pelo agente. */
export type EditorLanguageId =
  | 'typescript'
  | 'javascript'
  | 'jsx'
  | 'json'
  | 'css'
  | 'scss'
  | 'html'
  | 'markdown'
  | 'python'
  | 'rust'
  | 'go'
  | 'java'
  | 'kotlin'
  | 'cpp'
  | 'c'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'sql'
  | 'yaml'
  | 'xml'
  | 'shell'
  | 'powershell'
  | 'dockerfile'
  | 'toml'
  | 'lua'
  | 'r'
  | 'ini'
  | 'properties'
  | 'text'

export function languageIdFromPath(filePath: string): EditorLanguageId {
  const base = filePath.split(/[/\\]/).pop() ?? ''
  const lower = base.toLowerCase()

  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) {
    return 'dockerfile'
  }
  if (lower === 'makefile' || lower === 'gmakefile') {
    return 'shell'
  }
  if (lower === '.env' || lower.startsWith('.env.')) {
    return 'ini'
  }

  const ext = base.includes('.') ? base.split('.').pop()?.toLowerCase() : ''

  switch (ext) {
    case 'ts':
    case 'mts':
    case 'cts':
      return 'typescript'
    case 'tsx':
      return 'jsx'
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript'
    case 'jsx':
      return 'jsx'
    case 'json':
    case 'jsonc':
      return 'json'
    case 'css':
      return 'css'
    case 'scss':
    case 'sass':
      return 'scss'
    case 'less':
      return 'css'
    case 'html':
    case 'htm':
    case 'xhtml':
      return 'html'
    case 'vue':
    case 'svelte':
      return 'html'
    case 'md':
    case 'mdx':
      return 'markdown'
    case 'py':
    case 'pyw':
    case 'pyi':
      return 'python'
    case 'rs':
      return 'rust'
    case 'go':
      return 'go'
    case 'java':
      return 'java'
    case 'kt':
    case 'kts':
      return 'kotlin'
    case 'c':
    case 'h':
      return 'c'
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'hh':
    case 'hxx':
      return 'cpp'
    case 'cs':
      return 'java'
    case 'php':
      return 'php'
    case 'rb':
    case 'erb':
      return 'ruby'
    case 'swift':
      return 'swift'
    case 'sql':
      return 'sql'
    case 'yaml':
    case 'yml':
      return 'yaml'
    case 'xml':
    case 'svg':
    case 'xsl':
      return 'xml'
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return 'shell'
    case 'ps1':
    case 'psm1':
      return 'powershell'
    case 'bat':
    case 'cmd':
      return 'powershell'
    case 'toml':
      return 'toml'
    case 'lua':
      return 'lua'
    case 'r':
      return 'r'
    case 'ini':
    case 'cfg':
    case 'conf':
    case 'properties':
      return 'ini'
    default:
      return 'text'
  }
}
