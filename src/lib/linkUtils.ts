// Utility functions for parsing and handling links in messages

export interface ParsedLink {
  type: 'youtube' | 'url' | 'text';
  content: string;
  url?: string;
  videoId?: string;
  title?: string;
}

// Regular expressions for different link types
const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/**
 * Extract YouTube video ID from URL
 */
export const getYouTubeVideoId = (url: string): string | null => {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
};

/**
 * Check if URL is a YouTube video
 */
export const isYouTubeUrl = (url: string): boolean => {
  return YOUTUBE_REGEX.test(url);
};

/**
 * Parse message content and extract links
 */
export const parseMessageContent = (content: string): ParsedLink[] => {
  const parts: ParsedLink[] = [];
  let lastIndex = 0;
  
  // Find all URLs in the content
  const matches = Array.from(content.matchAll(URL_REGEX));
  
  for (const match of matches) {
    const url = match[0];
    const startIndex = match.index!;
    
    // Add text before the URL
    if (startIndex > lastIndex) {
      const textContent = content.slice(lastIndex, startIndex);
      if (textContent.trim()) {
        parts.push({
          type: 'text',
          content: textContent
        });
      }
    }
    
    // Check if it's a YouTube URL
    if (isYouTubeUrl(url)) {
      const videoId = getYouTubeVideoId(url);
      parts.push({
        type: 'youtube',
        content: url,
        url,
        videoId: videoId || undefined
      });
    } else {
      // Regular URL
      parts.push({
        type: 'url',
        content: url,
        url
      });
    }
    
    lastIndex = startIndex + url.length;
  }
  
  // Add remaining text after the last URL
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex);
    if (textContent.trim()) {
      parts.push({
        type: 'text',
        content: textContent
      });
    }
  }
  
  // If no URLs found, return the entire content as text
  if (parts.length === 0) {
    parts.push({
      type: 'text',
      content
    });
  }
  
  return parts;
};

/**
 * Get YouTube video thumbnail URL
 */
export const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

/**
 * Get YouTube embed URL
 */
export const getYouTubeEmbedUrl = (videoId: string): string => {
  return `https://www.youtube.com/embed/${videoId}`;
};

/**
 * Extract domain from URL for display
 */
export const getDomainFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
};