export const FOLDER_ICON_EXPORT_SIZE = 64
export const FOLDER_CUSTOM_ICON_MAX_CHARS = 96_000

const ACCEPTED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
])

export function isAcceptedIconFile(file: File): boolean {
  if (ACCEPTED_MIME.has(file.type)) return true
  const n = file.name.toLowerCase()
  return n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.webp') || n.endsWith('.ico')
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'))
    img.src = src
  })
}

export type CropParams = {
  scale: number
  offsetX: number
  offsetY: number
}

export type CropRect = { sx: number; sy: number; cropSize: number }

/** Área de recorte quadrada com zoom e deslocamento (-1…1). */
export function computeCropRect(
  iw: number,
  ih: number,
  { scale, offsetX, offsetY }: CropParams,
): CropRect {
  const base = Math.min(iw, ih)
  const cropSize = Math.max(8, base / Math.max(1, scale))
  const cx = iw / 2 + offsetX * (iw - cropSize) * 0.5
  const cy = ih / 2 + offsetY * (ih - cropSize) * 0.5
  let sx = cx - cropSize / 2
  let sy = cy - cropSize / 2
  sx = Math.max(0, Math.min(iw - cropSize, sx))
  sy = Math.max(0, Math.min(ih - cropSize, sy))
  return { sx, sy, cropSize }
}

/** Exporta recorte a partir de imagem já carregada. */
export function cropLoadedImage(
  img: HTMLImageElement,
  params: CropParams,
  outputSize = FOLDER_ICON_EXPORT_SIZE,
): string {
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  const { sx, sy, cropSize } = computeCropRect(iw, ih, params)

  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível.')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize)

  const dataUrl = canvas.toDataURL('image/png')
  if (dataUrl.length > FOLDER_CUSTOM_ICON_MAX_CHARS) {
    throw new Error('Imagem demasiado grande. Tente menos zoom ou outro ficheiro.')
  }
  return dataUrl
}

/** Recorta quadrado centrado com zoom e deslocamento (-1…1). */
export async function cropImageToSquare(
  imageSrc: string,
  params: CropParams,
  outputSize = FOLDER_ICON_EXPORT_SIZE,
): Promise<string> {
  const img = await loadImage(imageSrc)
  return cropLoadedImage(img, params, outputSize)
}

export function isValidCustomIconDataUrl(v: string): boolean {
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(v)) return false
  return v.length <= FOLDER_CUSTOM_ICON_MAX_CHARS
}
