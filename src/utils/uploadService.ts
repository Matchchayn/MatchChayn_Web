export interface UploadResponse {
  uploadUrl: string;
  publicUrl: string;
}

export const getPresignedUrl = async (fileName: string, fileType: string): Promise<UploadResponse> => {
  const response = await fetch('/api/media/presigned-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileName, fileType }),
  });

  if (!response.ok) {
    let errorMsg = 'Failed to get upload URL';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch (e) {
      // Fallback if backend returned non-JSON (like 502 HTML from proxy)
      errorMsg = await response.text().catch(() => `HTTP Error ${response.status}`);
    }
    throw new Error(errorMsg);
  }

  return response.json();
};

export const uploadFileToR2 = async (file: File, uploadUrl: string): Promise<void> => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file to R2');
  }
};

export const uploadFile = async (file: File | Blob, fileName: string): Promise<string> => {
  const { uploadUrl, publicUrl } = await getPresignedUrl(fileName, file.type);
  await uploadFileToR2(file as File, uploadUrl);
  
  return publicUrl;
};
