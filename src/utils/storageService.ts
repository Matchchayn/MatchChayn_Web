import { uploadFile } from './uploadService';

export async function uploadMedia(uid: string, file: File | Blob, type: 'image' | 'video'): Promise<string> {
  const extension = type === 'image' ? 'jpg' : 'mp4';
  const fileName = `${Date.now()}.${extension}`;
  
  // Using Cloudflare R2 instead of Firebase Storage
  return uploadFile(file, fileName);
}
