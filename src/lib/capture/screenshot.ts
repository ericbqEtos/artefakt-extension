import imageCompression from 'browser-image-compression';

export interface ProcessedScreenshot {
  thumbnail: Blob;
  fullImage: Blob;
}

export async function processScreenshot(dataUrl: string): Promise<ProcessedScreenshot> {
  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const originalBlob = await response.blob();

  // Create File object (required by browser-image-compression)
  const file = new File([originalBlob], 'screenshot.jpg', { type: 'image/jpeg' });

  // Create full-size compressed version (max 1280px width, max 200KB)
  const fullImage = await imageCompression(file, {
    maxWidthOrHeight: 1280,
    maxSizeMB: 0.2, // 200KB max
    initialQuality: 0.75,
    useWebWorker: true,
    fileType: 'image/jpeg'
  });

  // Create thumbnail (200px width, max 20KB)
  const thumbnail = await imageCompression(file, {
    maxWidthOrHeight: 200,
    maxSizeMB: 0.02, // 20KB max
    initialQuality: 0.7,
    useWebWorker: true,
    fileType: 'image/jpeg'
  });

  return { thumbnail, fullImage };
}

export function createObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url);
}
