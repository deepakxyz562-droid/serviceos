import type { DesignLayer } from './marketing-design';

type Size = { width: number; height: number };

export function photoFit(layer: DesignLayer): 'contain' | 'cover' {
  if (layer.photoFit) return layer.photoFit;
  return /logo|cutout|emblem/.test(layer.id) || /^data:image\/(png;base64|svg\+xml)/.test(layer.src || '')
    ? 'contain' : 'cover';
}

export function verticalAnchor(layer: DesignLayer) {
  return layer.cropY ?? (layer.id.includes('photo') || (layer.x === 0 && layer.y === 0) ? 0 : 50);
}

/** Rectangle of the oriented source image inside the clipping frame, in canvas pixels. */
export function framedPhoto(layer: DesignLayer, source: Size) {
  const scale = (photoFit(layer) === 'contain' ? Math.min : Math.max)(
    layer.width / source.width, layer.height / source.height
  );
  const width = source.width * scale;
  const height = source.height * scale;
  const fit = photoFit(layer) === 'contain';
  return { width, height, left: (layer.width - width) * (fit ? 0.5 : (layer.cropX ?? 50) / 100),
    top: (layer.height - height) * (fit ? 0.5 : verticalAnchor(layer) / 100) };
}

export function addedPhotoFrame(canvas: Size, source: Size) {
  const ratio = source.width > 0 && source.height > 0 ? source.width / source.height : 1;
  const width = Math.min(canvas.width * 0.8, canvas.height * 0.72 * ratio);
  const height = width / ratio;
  return { width, height, x: (canvas.width - width) / 2, y: (canvas.height - height) / 2 };
}
