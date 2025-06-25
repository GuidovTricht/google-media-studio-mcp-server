import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { generateImageFromText } from "./tools/generateImageFromText.js";
import { generateVideoFromImage } from "./tools/generateVideoFromImage.js";
import { generateVideoFromText } from "./tools/generateVideoFromText.js";

// Create an MCP server
const server = new McpServer({
  name: "google-media-studio-mcp-server",
  version: "1.0.0"
});

// Register image generation tool
server.registerTool(
  'generateImage',
  {
    title: 'Image Generation Tool',
    description: 'Generate an image based on a prompt',
    inputSchema: {
      prompt: z.string().min(1).max(1000),
      numberOfImages: z.number().min(1).max(4).default(1),
      includeFullData: z.union([z.boolean(), z.string()]).default(false),
    }
  },
  generateImageFromText
);

// Register text-to-video generation tool
server.registerTool(
  'generateVideoFromText',
  {
    title: 'Text-to-Video Generation Tool',
    description: 'Generate a video based on a text prompt',
    inputSchema: {
      prompt: z.string().min(1).max(1000),
      aspectRatio: z.enum(['16:9', '9:16']).default('16:9'),
      personGeneration: z.enum(['dont_allow', 'allow_adult']).default('dont_allow'),
      numberOfVideos: z.union([z.literal(1), z.literal(2)]).default(1),
      durationSeconds: z.number().min(5).max(8).default(5),
      enhancePrompt: z.union([z.boolean(), z.string()]).default(false),
      negativePrompt: z.string().default(''),
      includeFullData: z.union([z.boolean(), z.string()]).default(false),
      autoDownload: z.union([z.boolean(), z.string()]).default(true),
    }
  },
  generateVideoFromText
);

// Register image-to-video generation tool
server.registerTool(
  'generateVideoFromImage',
  {
    title: 'Image-to-Video Generation Tool',
    description: 'Generate a video based on an image prompt',
    inputSchema: {
      prompt: z.string().min(1).max(1000).optional().default('Generate a video from this image'),
      image: z.union([
        // ImageContent object
        z.object({
          type: z.literal('image'),
          mimeType: z.string(),
          data: z.string().min(1) // base64 encoded image data
        }),
        // URL string
        z.string().url(),
        // File path string
        z.string().min(1)
      ]),
      aspectRatio: z.enum(['16:9', '9:16']).default('16:9'),
      personGeneration: z.enum(['dont_allow', 'allow_adult']).default('dont_allow'),
      numberOfVideos: z.union([z.literal(1), z.literal(2)]).default(1),
      durationSeconds: z.number().min(5).max(8).default(5),
      enhancePrompt: z.union([z.boolean(), z.string()]).default(false),
      negativePrompt: z.string().default(''),
      includeFullData: z.union([z.boolean(), z.string()]).default(false),
      autoDownload: z.union([z.boolean(), z.string()]).default(true),
    }
  },
  generateVideoFromImage
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);