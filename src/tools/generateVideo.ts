import { GoogleGenAI } from '@google/genai';
import { veoClient } from '../services/veoClient.js';
import { CallToolResult, ImageContent, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { log } from '../utils/logger.js';
import appConfig from '../config.js';
import fs from 'fs/promises';
import path from 'path';

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
 * Gets image metadata by ID
 * 
 * @param id The image ID
 * @returns The image metadata
 */
async function getImageMetadata(id: string): Promise<any> {
  try {
    const metadataPath = path.resolve(IMAGE_STORAGE_DIR, `${id}.json`);
    const metadataJson = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(metadataJson);
  } catch (error) {
    log.error(`Error getting metadata for image ${id}:`, error);
    throw new Error(`Image metadata not found: ${id}`);
  }
}

/**
 * Tool for getting an image by ID
 * 
 * @param args The tool arguments
 * @returns The tool result
 */
export async function getImage(args: {
  id: string;
  includeFullData?: boolean | string;
}): Promise<CallToolResult> {
  try {
    log.info(`Getting image with ID: ${args.id}`);
    
    // Get the image metadata
    const metadata = await getImageMetadata(args.id);
    
    // Convert includeFullData to boolean if it's a string
    const includeFullData = typeof args.includeFullData === 'string'
      ? args.includeFullData.toLowerCase() === 'true' || args.includeFullData === '1'
      : args.includeFullData !== false;
    
    // Prepare response content
    const responseContent: Array<TextContent | ImageContent> = [];
    
    // If includeFullData is true (default) or not specified, include the image data
    if (includeFullData && metadata.filepath) {
      try {
        const imageData = await fs.readFile(metadata.filepath);
        responseContent.push({
          type: 'image',
          mimeType: metadata.mimeType || 'image/png',
          data: imageData.toString('base64')
        });
      } catch (error) {
        log.error(`Error reading image file ${metadata.filepath}:`, error);
        // Continue without the image data
      }
    }
    
    // Add text content with metadata
    responseContent.push({
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: 'Image retrieved successfully',
        imageId: metadata.id,
        resourceUri: `images://${metadata.id}`,
        filepath: metadata.filepath,
        prompt: metadata.prompt,
        createdAt: metadata.createdAt,
        mimeType: metadata.mimeType,
        size: metadata.size
      }, null, 2)
    });
    
    // Return the result
    return {
      content: responseContent
    };
  } catch (error) {
    log.error(`Error getting image:`, error);
    
    // Return the error
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error getting image: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

/**
 * Tool for listing all generated images
 * 
 * @returns The tool result
 */
export async function listGeneratedImages(): Promise<CallToolResult> {
  try {
    log.info('Listing all generated images');
    
    // Get all files in the image storage directory
    const files = await fs.readdir(IMAGE_STORAGE_DIR);
    
    // Filter for JSON metadata files
    const metadataFiles = files.filter(file => file.endsWith('.json'));
    
    // Read and parse each metadata file
    const imagesPromises = metadataFiles.map(async file => {
      const filePath = path.resolve(IMAGE_STORAGE_DIR, file);
      try {
        const metadataJson = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(metadataJson);
      } catch (error) {
        log.error(`Error reading image metadata file ${filePath}:`, error);
        return null;
      }
    });
    
    // Wait for all metadata to be read and filter out any null values
    const images = (await Promise.all(imagesPromises)).filter(image => image !== null);
    
    // Return the result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            count: images.length,
            images: images.map(image => ({
              id: image.id,
              createdAt: image.createdAt,
              prompt: image.prompt,
              resourceUri: `images://${image.id}`,
              filepath: image.filepath,
              mimeType: image.mimeType,
              size: image.size
            }))
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    log.error('Error listing images:', error);
    
    // Return the error
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error listing images: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

/**
 * Tool for listing all generated videos
 * 
 * @returns The tool result
 */
export async function listGeneratedVideos(): Promise<CallToolResult> {
  try {
    // Get all videos
    const videos = await veoClient.listVideos();
    
    // Return the result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            count: videos.length,
            videos: videos.map(video => ({
              id: video.id,
              createdAt: video.createdAt,
              prompt: video.prompt,
              resourceUri: `videos://${video.id}`,
              filepath: video.filepath,
              videoUrl: video.videoUrl
            }))
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    log.error('Error listing videos:', error);
    
    // Return the error
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error listing videos: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}
