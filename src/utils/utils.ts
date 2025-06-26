import { log } from './logger.js';
import fs from 'fs/promises';
import path from 'path';

class Utils {
  /**
   * Processes an image input which can be base64 data, a file path, or a URL
   * 
   * @param image The image input (base64 data, file path, or URL)
   * @param mimeType The MIME type of the image (optional, detected for files and URLs)
   * @returns The image bytes and MIME type
   */
  async processImageInput(
    image: string,
    mimeType?: string
  ): Promise<{ imageBytes: string; mimeType: string }> {
    // Check if the image is a URL
    if (image.startsWith('http://') || image.startsWith('https://')) {
      log.debug('Processing image from URL');
      const response = await fetch(image);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Get the MIME type from the response or use a default
      const responseMimeType = response.headers.get('content-type') || mimeType || 'image/jpeg';
      
      return {
        imageBytes: buffer.toString('base64'),
        mimeType: responseMimeType
      };
    }
    
    // Check if the image is a file path
    if (image.startsWith('/') || image.includes(':\\') || image.includes(':/')) {
      log.debug('Processing image from file path');
      const buffer = await fs.readFile(image);
      
      // Determine MIME type from file extension if not provided
      let detectedMimeType = mimeType;
      if (!detectedMimeType) {
        const extension = path.extname(image).toLowerCase();
        switch (extension) {
          case '.png':
            detectedMimeType = 'image/png';
            break;
          case '.jpg':
          case '.jpeg':
            detectedMimeType = 'image/jpeg';
            break;
          case '.gif':
            detectedMimeType = 'image/gif';
            break;
          case '.webp':
            detectedMimeType = 'image/webp';
            break;
          default:
            detectedMimeType = 'image/jpeg'; // Default
        }
      }
      
      return {
        imageBytes: buffer.toString('base64'),
        mimeType: detectedMimeType
      };
    }
    
    // Assume it's already base64 data
    return {
      imageBytes: image,
      mimeType: mimeType || 'image/png'
    };
  }
}

export const utils = new Utils();