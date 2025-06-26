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
 * Tool for generating a video from an image
 * 
 * @param args The tool arguments
 * @returns The tool result
 */
export async function generateVideoFromImage(args: {
  image: string | { type: 'image'; mimeType: string; data: string };
  prompt?: string;
  aspectRatio?: '16:9' | '9:16';
  numberOfVideos?: 1 | 2;
  durationSeconds?: number;
  enhancePrompt?: boolean | string;
  negativePrompt?: string;
  includeFullData?: boolean | string;
  autoDownload?: boolean | string;
}): Promise<CallToolResult> {
  try {
    log.info('Generating video from image');
    log.verbose('Image parameters:', JSON.stringify(args));
    
    // Extract image data based on the type
    let imageData: string;
    let mimeType: string | undefined;
    
    if (typeof args.image === 'string') {
      // It's a URL or file path
      imageData = args.image;
    } else {
      // It's an ImageContent object
      imageData = args.image.data;
      mimeType = args.image.mimeType;
    }
    
    // Convert string boolean parameters to actual booleans
    const enhancePrompt = typeof args.enhancePrompt === 'string'
      ? args.enhancePrompt.toLowerCase() === 'true' || args.enhancePrompt === '1'
      : args.enhancePrompt ?? false;
      
    const includeFullData = typeof args.includeFullData === 'string'
      ? args.includeFullData.toLowerCase() === 'true' || args.includeFullData === '1'
      : args.includeFullData ?? false;
      
    const autoDownload = typeof args.autoDownload === 'string'
      ? args.autoDownload.toLowerCase() === 'true' || args.autoDownload === '1'
      : args.autoDownload ?? true;
    
    // Create config object from individual parameters with defaults
    const config = {
      aspectRatio: args.aspectRatio || '16:9',
      numberOfVideos: args.numberOfVideos || 1,
      durationSeconds: args.durationSeconds || 5,
      enhancePrompt: enhancePrompt,
      negativePrompt: args.negativePrompt || ''
    };

    // Options for video generation with defaults
    const options = {
      includeFullData: includeFullData,
      autoDownload: autoDownload
    };
    
    // Generate the video
    const result = await veoClient.generateFromImage(
      imageData, 
      args.prompt, 
      config,
      options,
      mimeType
    );
    
    // Prepare response content
    const responseContent: Array<TextContent | ImageContent> = [];
    
    // If includeFullData is true and we have video data, include it in the response
    if (args.includeFullData && result.videoData) {
      responseContent.push({
        type: 'image', // Use 'image' type for video content since MCP doesn't have a 'video' type
        mimeType: result.mimeType,
        data: result.videoData
      });
    }
    
    // Add text content with metadata
    responseContent.push({
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: 'Video generated successfully',
        videoId: result.id,
        resourceUri: `videos://${result.id}`,
        filepath: result.filepath,
        videoUrl: result.videoUrl,
        metadata: result
      }, null, 2)
    });
    
    // Return the result
    return {
      content: responseContent
    };
  } catch (error) {
    log.error('Error generating video from image:', error);
    
    // Return the error
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error generating video: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}