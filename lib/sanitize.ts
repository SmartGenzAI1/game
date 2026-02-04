import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Initialize DOMPurify with a DOM window (required for server-side)
const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - Untrusted HTML string
 * @param options - DOMPurify configuration options
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(dirty: string, options?: DOMPurify.Config): string {
  if (typeof dirty !== 'string') {
    return '';
  }

  const defaultOptions: DOMPurify.Config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    ...options,
  };

  return purify.sanitize(dirty, defaultOptions);
}

/**
 * Sanitize plain text content (removes all HTML tags)
 * @param dirty - Untrusted string
 * @returns Sanitized plain text string
 */
export function sanitizeText(dirty: string): string {
  if (typeof dirty !== 'string') {
    return '';
  }

  // Remove all HTML tags
  return dirty.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize URL to prevent javascript: and data: protocol attacks
 * @param url - Untrusted URL string
 * @returns Sanitized URL string or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  try {
    // Parse the URL
    let parsedUrl: URL;
    
    // Add protocol if missing
    if (!url.match(/^https?:\/\//i)) {
      parsedUrl = new URL(`https://${url}`);
    } else {
      parsedUrl = new URL(url);
    }

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return '';
    }

    // Remove javascript:, data:, and other dangerous protocols from query params
    const dangerousPatterns = [
      /javascript:/gi,
      /data:/gi,
      /vbscript:/gi,
      /file:/gi,
      /ftp:/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(parsedUrl.href)) {
        return '';
      }
    }

    return parsedUrl.href;
  } catch {
    return '';
  }
}

/**
 * Sanitize username (alphanumeric, hyphens, underscores only)
 * @param username - Untrusted username string
 * @returns Sanitized username string
 */
export function sanitizeUsername(username: string): string {
  if (typeof username !== 'string') {
    return '';
  }

  // Remove any characters that aren't alphanumeric, hyphens, or underscores
  return username.replace(/[^a-zA-Z0-9_-]/g, '').trim();
}

/**
 * Sanitize email address
 * @param email - Untrusted email string
 * @returns Sanitized email string
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  // Basic email sanitization - trim and lowercase
  return email.trim().toLowerCase();
}

/**
 * Sanitize display name (remove HTML tags and limit length)
 * @param name - Untrusted name string
 * @param maxLength - Maximum allowed length
 * @returns Sanitized name string
 */
export function sanitizeName(name: string, maxLength: number = 100): string {
  if (typeof name !== 'string') {
    return '';
  }

  // Remove HTML tags and trim
  const sanitized = sanitizeText(name);
  
  // Truncate if too long
  return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
}

/**
 * Sanitize bio text (allow some formatting but prevent XSS)
 * @param bio - Untrusted bio string
 * @param maxLength - Maximum allowed length
 * @returns Sanitized bio string
 */
export function sanitizeBio(bio: string, maxLength: number = 500): string {
  if (typeof bio !== 'string') {
    return '';
  }

  // Sanitize HTML to prevent XSS
  const sanitized = sanitizeHtml(bio);
  
  // Truncate if too long
  return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
}

/**
 * Sanitize link title
 * @param title - Untrusted title string
 * @param maxLength - Maximum allowed length
 * @returns Sanitized title string
 */
export function sanitizeLinkTitle(title: string, maxLength: number = 100): string {
  if (typeof title !== 'string') {
    return '';
  }

  // Remove HTML tags and trim
  const sanitized = sanitizeText(title);
  
  // Truncate if too long
  return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
}

/**
 * Validate and sanitize avatar URL
 * @param url - Untrusted avatar URL string
 * @returns Sanitized avatar URL string or empty string if invalid
 */
export function sanitizeAvatarUrl(url: string): string {
  if (typeof url !== 'string' || url.trim() === '') {
    return '';
  }

  const sanitized = sanitizeUrl(url);
  
  // Additional check for image URLs
  if (sanitized) {
    try {
      const parsed = new URL(sanitized);
      // Only allow common image hosting domains or your own domain
      // This is a basic check - you may want to customize based on your needs
      const allowedDomains = [
        'images.unsplash.com',
        'cdn.pixabay.com',
        'i.pravatar.cc',
        'ui-avatars.com',
        'github.com',
        'gravatar.com',
      ];
      
      // For now, just ensure it's a valid http/https URL
      // You can add domain restrictions as needed
      return sanitized;
    } catch {
      return '';
    }
  }
  
  return '';
}

/**
 * Escape special characters in a string for use in HTML context
 * @param str - String to escape
 * @returns Escaped string
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }

  const map: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#039;',
  };

  return str.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Escape special characters in a string for use in JavaScript context
 * @param str - String to escape
 * @returns Escaped string
 */
export function escapeJs(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }

  return str.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

/**
 * Validate that a string doesn't contain dangerous patterns
 * @param str - String to validate
 * @returns True if safe, false if dangerous
 */
export function isSafeString(str: string): boolean {
  if (typeof str !== 'string') {
    return false;
  }

  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:/i,
    /vbscript:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /<input/i,
  ];

  return !dangerousPatterns.some(pattern => pattern.test(str));
}

/**
 * Sanitize an object by recursively sanitizing all string values
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Use text sanitization by default
      sanitized[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value);
    } else {
      // Keep non-string values as-is
      sanitized[key] = value;
    }
  }

  return sanitized;
}
