import { GeneratedImage, GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import appConfig from '../config.js';
import { log } from '../utils/logger.js';

// Initialize the Google Gen AI client for image generation
const ai = new GoogleGenAI({ apiKey: appConfig.GOOGLE_API_KEY });

// Define the storage directory for generated images
const IMAGE_STORAGE_DIR = path.join(appConfig.STORAGE_DIR, 'images');

// Define types for image generation
interface ImageConfig {
  numberOfImages: number;
}

/**
 * Client for interacting with Google's Veo2 video generation API
 */
export class ImagenClient {
  private model: string = appConfig.GOOGLE_IMAGEN_MODEL;

  async generateFromText(
    prompt: string, 
    config?: ImageConfig
  ): Promise<{ id: string; filepath: string; generatedImage: GeneratedImage }> {
    // Generate the image using Imagen
    const response = await ai.models.generateImages({
      model: this.model,
      prompt: prompt,
      config: config,
    });
    
    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error('No images generated in the response');
    }
    
    const generatedImage = response.generatedImages[0];
    
    if (!generatedImage.image?.imageBytes) {
      throw new Error('Generated image missing image bytes');
    }
    
    // Save the generated image to disk
    const { id, filepath } = await this.saveGeneratedImage(
      generatedImage.image.imageBytes,
      prompt,
      'image/png'
    );
    
    return { id, filepath, generatedImage };
  }

  // async generateFromImage(
  //   image: string,
  //   prompt: string, 
  //   config?: ImageConfig,
  //   mimeType?: string
  // ): Promise<{ id: string; filepath: string; generatedImage: GeneratedImage }> {
      
  //   // Create generation config
  //   const generateConfig: Record<string, any> = {};
    
  //   // Add optional parameters if provided
  //   if (config?.aspectRatio) {
  //     generateConfig.aspectRatio = config.aspectRatio;
  //   }
    
  //   // Note: personGeneration is not allowed for image-to-video generation
    
  //   if (config?.numberOfVideos) {
  //     generateConfig.numberOfVideos = config.numberOfVideos;
  //   }
    
  //   if (config?.durationSeconds) {
  //     generateConfig.durationSeconds = config.durationSeconds;
  //   }
          
  //   if (config?.negativePrompt) {
  //     generateConfig.negativePrompt = config.negativePrompt;
  //   }

  //   // Process the image input
  //   const { imageBytes, mimeType: detectedMimeType } = await utils.processImageInput(image, mimeType);
    
  //   // Initialize request parameters with the image
  //   const requestParams = {
  //     model: this.model,
  //     prompt: prompt || 'Generate an image from this image',
  //     referenceImages: [
  //       {
  //         referenceImage: {
  //           imageBytes: imageBytes,
  //           mimeType: detectedMimeType
  //         }
  //       }],
  //     config: generateConfig
  //   };
    
  //   // Generate the image using Imagen
  //   await ai.models.editImage(requestParams)


  //   const response = await ai.models.generateImages({
  //     model: this.model,
  //     prompt: prompt,
  //     config: config,
  //   });
    
  //   if (!response.generatedImages || response.generatedImages.length === 0) {
  //     throw new Error('No images generated in the response');
  //   }
    
  //   const generatedImage = response.generatedImages[0];
    
  //   if (!generatedImage.image?.imageBytes) {
  //     throw new Error('Generated image missing image bytes');
  //   }
    
  //   // Save the generated image to disk
  //   const { id, filepath } = await this.saveGeneratedImage(
  //     generatedImage.image.imageBytes,
  //     prompt,
  //     'image/png'
  //   );
    
  //   return { id, filepath, generatedImage };
  // }

  /**
   * Saves a generated image to disk
   * 
   * @param imageBytes The base64 encoded image data
   * @param prompt The prompt used to generate the image
   * @param mimeType The MIME type of the image
   * @returns The filepath and ID of the saved image
   */
  private async saveGeneratedImage(
    imageBytes: string,
    prompt: string,
    mimeType: string = 'image/png'
  ): Promise<{ id: string; filepath: string }> {
    try {
      // Generate a unique ID for the image
      const id = uuidv4();
      
      // Determine the file extension based on MIME type
      let extension = '.png';
      if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        extension = '.jpg';
      } else if (mimeType === 'image/webp') {
        extension = '.webp';
      }
      
      // Create the file path
      const filepath = path.resolve(IMAGE_STORAGE_DIR, `${id}${extension}`);
      
      // Convert base64 to buffer and save to disk
      const buffer = Buffer.from(imageBytes, 'base64');
      await fs.writeFile(filepath, buffer);
      
      // Save metadata
      const metadata = {
        id,
        createdAt: new Date().toISOString(),
        prompt,
        mimeType,
        size: buffer.length,
        filepath
      };
      
      const metadataPath = path.resolve(IMAGE_STORAGE_DIR, `${id}.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      log.info(`Image saved successfully with ID: ${id}`);
      return { id, filepath };
    } catch (error) {
      log.error('Error saving generated image:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const imagenClient = new ImagenClient();