import sharp from 'sharp';

export interface ProcessedImageResult {
  buffer: Buffer;
  width?: number;
  height?: number;
  format?: string;
}

/**
 * Gıda fabrikası ortamındaki yetersiz ışık ve gölgeleri temizlemek,
 * el yazılarının ve onay işaretlerinin algılanabilirliğini artırmak için
 * görselleri ön işlemden (pre-processing) geçirir.
 */
export async function preprocessImage(inputBuffer: Buffer): Promise<ProcessedImageResult> {
  try {
    const processed = await sharp(inputBuffer)
      .rotate() // EXIF meta-datasına göre resmi otomatik olarak dikey (dik) konuma getirir
      .grayscale() // Renk gürültülerini elemek için siyah-beyaz yapar
      .normalize() // Kontrast aralığını normalize ederek soluk yazıları koyulaştırır
      .sharpen({
        sigma: 1.5,
        flat: 1.0,
        jagged: 2.0
      }) // Yazıların kenarlarını ve el yazısı çizgilerini keskinleştirir
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true
      }) // Çözünürlüğü optimize eder, yerel sunucu işlemci yükünü dengeler
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: processed.data,
      width: processed.info.width,
      height: processed.info.height,
      format: processed.info.format,
    };
  } catch (error) {
    console.error('Sharp görüntü önişleme hatası:', error);
    throw new Error('Görsel iyileştirme ve önişleme başarısız oldu.');
  }
}
