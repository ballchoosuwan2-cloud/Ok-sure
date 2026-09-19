/**
 * Compress and resize an uploaded image file client-side using HTML5 Canvas.
 * Keeps image size minimal (~30-80KB) so storing in IndexedDB/localforage
 * remains fast and never lags the app.
 */
export async function processAndCompressImage(
  file: File,
  maxDimension = 640,
  quality = 0.82
): Promise<string> {
  // Validate MIME type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type.toLowerCase())) {
    throw new Error('รองรับเฉพาะไฟล์รูปภาพ JPG, JPEG, PNG หรือ WEBP เท่านั้น');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale down if exceeds maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('ไม่สามารถประมวลผลรูปภาพได้ (Canvas error)'));
            return;
          }

          // Draw image to canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Output as JPEG data URL for compact size
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('ไฟล์รูปภาพเสียหายหรือไม่สามารถเปิดได้'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์รูปภาพ'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Convert a Data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

