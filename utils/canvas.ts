import { createCanvas, loadImage, registerFont } from "canvas";
import { AttachmentBuilder } from "discord.js";
import * as path from "path";

// Font registration tracking
const registeredFonts = new Set<string>();

// Image cache to prevent memory leaks
const imageCache = new Map<string, any>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 50;

interface CachedImage {
  image: any;
  timestamp: number;
}

// Clean up expired cache entries
function cleanupImageCache() {
  const now = Date.now();
  for (const [key, cached] of imageCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      imageCache.delete(key);
    }
  }
  
  // If cache is still too large, remove oldest entries
  if (imageCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = Array.from(imageCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = sortedEntries.slice(0, imageCache.size - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      imageCache.delete(key);
    }
  }
}

// Load image with caching and timeout
async function loadImageWithCache(url: string, timeoutMs: number = 10000): Promise<any> {
  // Clean up cache periodically
  if (Math.random() < 0.1) { // 10% chance to clean up
    cleanupImageCache();
  }
  
  // Check cache first
  const cached = imageCache.get(url);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.image;
  }
  
  // Load image with timeout
  const loadPromise = loadImage(url);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Image load timeout: ${url}`)), timeoutMs);
  });
  
  try {
    const image = await Promise.race([loadPromise, timeoutPromise]);
    
    // Cache the loaded image
    imageCache.set(url, {
      image,
      timestamp: Date.now()
    });
    
    return image;
  } catch (error) {
    console.error(`Failed to load image ${url}:`, error);
    throw error;
  }
}

/**
 * Registers a custom font for use in canvas (only once per font)
 * @param fontPath - Path to the font file (TTF, OTF, etc.)
 * @param fontFamily - Name to reference the font by
 */
export function registerCustomFont(fontPath: string, fontFamily: string) {
  const fontKey = `${fontFamily}:${fontPath}`;
  
  // Skip if already registered
  if (registeredFonts.has(fontKey)) {
    return;
  }
  
  try {
    registerFont(fontPath, { family: fontFamily, weight: "bold", style: "normal" });
    registeredFonts.add(fontKey);
    console.log(`Font registered: ${fontFamily} from ${fontPath}`);
  } catch (error) {
    console.error(`Failed to register font ${fontFamily}:`, error);
  }
}

/**
 * Automatically registers all fonts for the project
 * Call this once during application startup
 */
export function initializeFonts() {
  registerCustomFont("./assets/JS-Chusri-Normal.ttf", "JS-Chusri");
  registerCustomFont("./assets/JS-Chusri-Normal.ttf", "js-chusri"); // Alternative name used in welcome.ts
}

/**
 * Clear image cache (useful for memory management)
 */
export function clearImageCache() {
  imageCache.clear();
  console.log('Image cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    imageCache: {
      size: imageCache.size,
      maxSize: MAX_CACHE_SIZE,
      ttl: CACHE_TTL
    },
    registeredFonts: registeredFonts.size
  };
}

/**
 * Creates a welcome banner with:
 * - Centered avatar
 * - Centered text below avatar
 * - Emblem text above
 * - Custom PNG background
 *
 * @param username - Name of the new member
 * @param avatarURL - URL of the user's avatar
 * @param welcomeText - Main welcome message
 * @param emblemText - Small emblem/title above the avatar
 * @param serverName - Optional server name below welcome text
 * @param backgroundURL - URL or local path to PNG background
 * @param customFont - Optional custom font family name (must be registered first)
 */
export async function createWelcomeBanner(
  username: string,
  avatarURL: string,
  welcomeText: string,
  emblemText: string,
  serverName?: string,
  backgroundURL?: string, // optional PNG background
  customFont?: string, // optional custom font family
) {
  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // ===== Background =====
  if (backgroundURL) {
    try {
      const bg = await loadImageWithCache(backgroundURL);
      ctx.drawImage(bg, 0, 0, width, height);
    } catch (error) {
      console.error('Failed to load background image, using fallback:', error);
      // fallback to solid color
      ctx.fillStyle = "#2c2f33";
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    // fallback to solid color
    ctx.fillStyle = "#2c2f33";
    ctx.fillRect(0, 0, width, height);
  }

  // ===== Emblem text (top) =====
  const fontFamily = customFont || "Sans";
  ctx.font = `bold 80px ${fontFamily}`;
  ctx.textAlign = "center";
  
  // Create gradient for emblem text
  const emblemGradient = ctx.createLinearGradient(0, 0, 0, 100);
  emblemGradient.addColorStop(0, "#FFD700"); // Gold top
  emblemGradient.addColorStop(0.5, "#FFA500"); // Orange middle
  emblemGradient.addColorStop(1, "#FF6B35"); // Red-orange bottom
  
  // Multiple shadow layers for depth
  ctx.save();
  
  // Large outer glow
  ctx.shadowColor = "rgba(255, 215, 0, 0.8)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
  ctx.fillText(emblemText, width / 2, 70);
  
  // Medium shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = emblemGradient;
  ctx.fillText(emblemText, width / 2, 70);
  
  ctx.restore();
  
  // Stroke outline for definition
  ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
  ctx.lineWidth = 3;
  ctx.strokeText(emblemText, width / 2, 70);
  
  // Final gradient fill
  ctx.fillStyle = emblemGradient;
  ctx.fillText(emblemText, width / 2, 70);

  // ===== Avatar (centered) =====
  let avatar;
  try {
    avatar = await loadImageWithCache(avatarURL);
  } catch (error) {
    console.error('Failed to load avatar, using default:', error);
    // Create a default avatar (simple circle)
    const defaultCanvas = createCanvas(150, 150);
    const defaultCtx = defaultCanvas.getContext('2d');
    defaultCtx.fillStyle = '#7289da';
    defaultCtx.beginPath();
    defaultCtx.arc(75, 75, 75, 0, Math.PI * 2);
    defaultCtx.fill();
    defaultCtx.fillStyle = '#ffffff';
    defaultCtx.font = '60px Sans';
    defaultCtx.textAlign = 'center';
    defaultCtx.textBaseline = 'middle';
    defaultCtx.fillText('?', 75, 75);
    avatar = defaultCanvas;
  }
  
  const avatarSize = 150; // change avatar size here
  const avatarX = width / 2 - avatarSize / 2; // horizontal center
  const avatarY = height / 2 - avatarSize / 2 - 20; // vertical position

  // Avatar white glow effect (rendered BEFORE avatar)
  ctx.save();
  
  // Large outer white glow
  ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.beginPath();
  ctx.arc(width / 2, avatarY + avatarSize / 2, avatarSize / 2 + 10, 0, Math.PI * 2);
  ctx.fill();
  
  // Medium white glow
  ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
  ctx.shadowBlur = 25;
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.beginPath();
  ctx.arc(width / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner white glow
  ctx.shadowColor = "rgba(255, 255, 255, 1)";
  ctx.shadowBlur = 15;
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  ctx.beginPath();
  ctx.arc(width / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();

  // Draw avatar on top of the glow
  ctx.save();
  ctx.beginPath();
  ctx.arc(width / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();

  // ===== Welcome text (below avatar) =====
  let fontSize = 60; // starting font size - made bigger
  ctx.font = `normal ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  
  const welcomeFullText = welcomeText ? `${welcomeText} ${username}` : username;
  
  while (ctx.measureText(welcomeFullText).width > width - 100) {
    fontSize -= 2;
    ctx.font = `normal ${fontSize}px ${fontFamily}`;
  }
  
  // Create gradient for welcome text
  const welcomeGradient = ctx.createLinearGradient(0, avatarY + avatarSize + 50, 0, avatarY + avatarSize + 90);
  welcomeGradient.addColorStop(0, "#FFFFFF"); // White top
  welcomeGradient.addColorStop(0.5, "#E6E6FA"); // Light lavender middle
  welcomeGradient.addColorStop(1, "#DDA0DD"); // Plum bottom
  
  ctx.save();
  
  // Large glow effect
  ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
  ctx.shadowBlur = 25;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillText(welcomeFullText, width / 2, avatarY + avatarSize + 70);
  
  // Drop shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = welcomeGradient;
  ctx.fillText(welcomeFullText, width / 2, avatarY + avatarSize + 70);
  
  ctx.restore();
  
  // Subtle stroke for definition
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 2;
  ctx.strokeText(welcomeFullText, width / 2, avatarY + avatarSize + 70);
  
  // Final gradient fill
  ctx.fillStyle = welcomeGradient;
  ctx.fillText(welcomeFullText, width / 2, avatarY + avatarSize + 70);

  // ===== Server name (optional, below welcome text) =====
  if (serverName) {
    ctx.font = `40px ${fontFamily}`; // made bigger
    
    // Create gradient for server name
    const serverGradient = ctx.createLinearGradient(0, avatarY + avatarSize + 110, 0, avatarY + avatarSize + 140);
    serverGradient.addColorStop(0, "#FFD700"); // Gold top
    serverGradient.addColorStop(0.5, "#FFA500"); // Orange middle
    serverGradient.addColorStop(1, "#FF8C00"); // Dark orange bottom
    
    ctx.save();
    
    // Glow effect
    ctx.shadowColor = "rgba(255, 165, 0, 0.6)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = "rgba(255, 165, 0, 0.3)";
    ctx.fillText(serverName, width / 2, avatarY + avatarSize + 125); // moved lower
    
    // Drop shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = serverGradient;
    ctx.fillText(serverName, width / 2, avatarY + avatarSize + 125); // moved lower
    
    ctx.restore();
    
    // Stroke outline
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeText(serverName, width / 2, avatarY + avatarSize + 125); // moved lower
    
    // Final gradient fill
    ctx.fillStyle = serverGradient;
    ctx.fillText(serverName, width / 2, avatarY + avatarSize + 125); // moved lower
  }

  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "welcome.png",
  });
}
