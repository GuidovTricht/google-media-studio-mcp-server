import { GoogleGenAI } from '@google/genai';
import { imagenClient } from '../services/imagenClient.js';
import { CallToolResult, ImageContent, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { log } from '../utils/logger.js';
import appConfig from '../config.js';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Initialize the Google Gen AI client for image generation
const ai = new GoogleGenAI({ apiKey: appConfig.GOOGLE_API_KEY });

// Define the storage directory for generated images
const IMAGE_STORAGE_DIR = path.join(appConfig.STORAGE_DIR, 'images');

// Ensure the image storage directory exists
(async () => {
  try {
    await fs.mkdir(IMAGE_STORAGE_DIR, { recursive: true });
  } catch (error) {
    log.fatal('Failed to create image storage directory:', error);
    process.exit(1);
  }
})();

/**
 * Tool for generating an image from a text prompt
 * 
 * @param args The tool arguments
 * @returns The tool result with generated image
 */
export async function generateImageFromText(args: {
  prompt: string;
  numberOfImages?: number;
  includeFullData?: boolean | string;
}): Promise<CallToolResult> {
  try {
    log.info('Generating image from text prompt');
    log.verbose('Image generation parameters:', JSON.stringify(args));
    
    // Create config object
    const config = {
      numberOfImages: args.numberOfImages || 1
    };
    
    // Generate the image
    const { id, filepath, generatedImage } = await imagenClient.generateFromText(args.prompt, config);

    if (!generatedImage.image?.imageBytes) {
      throw new Error('Generated image missing image bytes');
    }
    
    // Prepare response content
    const responseContent: Array<TextContent | ImageContent> = [];
    
    // Convert includeFullData to boolean if it's a string
    const includeFullData = typeof args.includeFullData === 'string'
      ? args.includeFullData.toLowerCase() === 'true' || args.includeFullData === '1'
      : args.includeFullData !== false;
    
    // If includeFullData is true (default) or not specified, include the image data
    if (includeFullData) {
      responseContent.push({
        type: 'image',
        mimeType: 'image/png',
        data: generatedImage.image.imageBytes
      });
    }
    
    // Add text content with metadata
    responseContent.push({
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: 'Image generated successfully',
        imageId: id,
        resourceUri: `images://${id}`,
        filepath: filepath
      }, null, 2)
    });
    
    // Return the result
    return {
      content: responseContent
    };
  } catch (error) {
    log.error('Error generating image:', error);
    
    // Return the error
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error generating image: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}