// เตรียมรูปก่อนอัปโหลด: รูปใหญ่จากกล้องมือถือ (หลายสิบ MB ต่อรูป) ย่อให้พอดีกับหน้าจอเพื่อประหยัดพื้นที่ Storage (แพ็กเกจฟรี 1 GB)
const COMPRESS_OVER_BYTES = 1.5 * 1024 * 1024; // รูปเล็กกว่านี้ใช้ตามเดิม
const MAX_SIDE = 2560; // px ด้านยาวสุด
const QUALITY = 0.85;

/** ย่อ/บีบอัดรูปเป็น JPEG (หมุนตามแนวถ่าย พื้นโปร่งใสเติมขาว); ถ้าย่อไม่ได้หรือไม่เล็กลง คืนไฟล์เดิม */
export async function prepareImage(file: File): Promise<File> {
  if (file.size <= COMPRESS_OVER_BYTES || typeof createImageBitmap === 'undefined') return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
