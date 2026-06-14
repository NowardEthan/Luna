/** Conteúdo dos tabs — fora do React state para evitar re-renders a cada tecla. */

const buffers = new Map<string, string>()

export function setTabBuffer(path: string, content: string): void {
  buffers.set(path, content)
}

export function getTabBuffer(path: string): string | undefined {
  return buffers.get(path)
}

export function deleteTabBuffer(path: string): void {
  buffers.delete(path)
}

export function clearTabBuffers(): void {
  buffers.clear()
}
