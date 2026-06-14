export type LunaFilePlace = {
  id: string
  label: string
  path: string
  icon: string
}

export type LunaFileEntry = {
  name: string
  path: string
  type: 'directory' | 'file' | 'unknown'
  size: number
  modifiedAt: number
}

export type LunaFilePickerAccept = {
  /** Ex.: ['.zip'] ou ['.png', '.jpg'] */
  extensions?: string[]
  /** Máximo de ficheiros (1 = único). */
  maxFiles?: number
  /** Tamanho máx. por ficheiro em bytes. */
  maxBytesPerFile?: number
}

export function isLunaFileExplorerAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.lunaFiles?.listDirectory)
}

export async function lunaGetPlaces(): Promise<{
  places: LunaFilePlace[]
  home: string
}> {
  if (!window.lunaFiles?.getPlaces) {
    throw new Error('Explorador Luna indisponível (use a app desktop).')
  }
  const r = await window.lunaFiles.getPlaces()
  if (!r.ok) throw new Error('Não foi possível carregar atalhos.')
  return { places: r.places ?? [], home: r.home ?? '' }
}

export async function lunaListDirectory(
  dirPath: string,
  options?: { showHidden?: boolean },
): Promise<{
  path: string
  parent: string
  entries: LunaFileEntry[]
  truncated?: boolean
}> {
  if (!window.lunaFiles?.listDirectory) {
    throw new Error('Explorador Luna indisponível.')
  }
  const r = await window.lunaFiles.listDirectory(dirPath, options)
  if (!r.ok || !r.path) {
    throw new Error(r.error ?? 'Falha ao listar pasta.')
  }
  return {
    path: r.path,
    parent: r.parent ?? dirPath,
    entries: (r.entries ?? []) as LunaFileEntry[],
    truncated: r.truncated,
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const bin = atob(base64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function lunaPathToFile(
  filePath: string,
  maxBytes?: number,
): Promise<File> {
  if (!window.lunaFiles?.readFileBinary) {
    throw new Error('Leitura de arquivo indisponível.')
  }
  const r = await window.lunaFiles.readFileBinary(filePath, maxBytes)
  if (!r.ok || !r.base64 || !r.name) {
    throw new Error(r.error ?? 'Não foi possível ler o arquivo.')
  }
  const bytes = base64ToUint8Array(r.base64)
  return new File([new Uint8Array(bytes)], r.name, {
    type: r.mime ?? 'application/octet-stream',
    lastModified: Date.now(),
  })
}

export function fileMatchesAccept(name: string, accept?: LunaFilePickerAccept): boolean {
  if (!accept?.extensions?.length) return true
  const lower = name.toLowerCase()
  return accept.extensions.some((ext) => {
    const e = ext.startsWith('.') ? ext : `.${ext}`
    return lower.endsWith(e.toLowerCase())
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
