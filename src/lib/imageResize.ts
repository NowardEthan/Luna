/** Redimensiona para caber no limite de base64 da API (~4MB) e acelerar inferência. */
const MAX_SIDE = 1280
const JPEG_QUALITY = 0.82

export type PreparedImageAttachment = {
  id: string
  name: string
  /** data:image/jpeg;base64,... */
  dataUrl: string
}

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function fileToVisionJpegDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(
      1,
      MAX_SIDE / Math.max(bitmap.width, bitmap.height, 1),
    )
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D indisponível')
    ctx.drawImage(bitmap, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } finally {
    bitmap.close()
  }
}

export async function prepareImageAttachment(
  file: File,
): Promise<PreparedImageAttachment> {
  const dataUrl = await fileToVisionJpegDataUrl(file)
  return {
    id: nextId(),
    name: file.name.replace(/\s+/g, ' ').trim() || 'imagem.jpg',
    dataUrl,
  }
}
