import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeUsername,
  sanitizeEmail,
  sanitizeName,
  sanitizeBio,
  sanitizeLinkTitle,
  sanitizeAvatarUrl,
  escapeHtml,
  escapeJs,
  isSafeString,
  sanitizeObject,
} from '@/lib/sanitize';

describe('sanitizeHtml', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("xss")</script><p>Safe content</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>Safe content</p>');
  });

  it('should remove iframe tags', () => {
    const input = '<iframe src="evil.com"></iframe><p>Safe</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<iframe>');
    expect(result).toContain('<p>Safe</p>');
  });

  it('should remove object tags', () => {
    const input = '<object data="evil.swf"></object><p>Safe</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<object>');
    expect(result).toContain('<p>Safe</p>');
  });

  it('should remove embed tags', () => {
    const input = '<embed src="evil.swf"><p>Safe</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<embed>');
    expect(result).toContain('<p>Safe</p>');
  });

  it('should remove inline event handlers', () => {
    const input = '<div onclick="alert(1)" onmouseover="alert(2)">Content</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onmouseover');
  });

  it('should allow safe HTML tags', () => {
    const input = '<p><strong>Bold</strong> <em>italic</em> <a href="https://example.com">link</a></p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
    expect(result).toContain('<a href=');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeHtml(null as any)).toBe('');
    expect(sanitizeHtml(undefined as any)).toBe('');
    expect(sanitizeHtml(123 as any)).toBe('');
    expect(sanitizeHtml({} as any)).toBe('');
  });

  it('should handle empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('should remove form and input tags', () => {
    const input = '<form><input type="text"></form><p>Safe</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<form>');
    expect(result).not.toContain('<input>');
    expect(result).toContain('<p>Safe</p>');
  });
});

describe('sanitizeText', () => {
  it('should remove all HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    const result = sanitizeText(input);
    expect(result).toBe('Hello world');
  });

  it('should trim whitespace', () => {
    const input = '  Hello world  ';
    const result = sanitizeText(input);
    expect(result).toBe('Hello world');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeText(null as any)).toBe('');
    expect(sanitizeText(undefined as any)).toBe('');
    expect(sanitizeText(123 as any)).toBe('');
  });

  it('should handle empty string', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('should handle nested HTML tags', () => {
    const input = '<div><p><span>Text</span></p></div>';
    const result = sanitizeText(input);
    expect(result).toBe('Text');
  });
});

describe('sanitizeUrl', () => {
  it('should accept valid HTTP URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('should add https:// prefix if missing', () => {
    expect(sanitizeUrl('example.com')).toBe('https://example.com');
    expect(sanitizeUrl('www.example.com')).toBe('https://www.example.com');
  });

  it('should reject javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
  });

  it('should reject data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(sanitizeUrl('DATA:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('should reject vbscript: protocol', () => {
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
  });

  it('should reject file: protocol', () => {
    expect(sanitizeUrl('file:///etc/passwd')).toBe('');
  });

  it('should reject ftp: protocol', () => {
    expect(sanitizeUrl('ftp://example.com')).toBe('');
  });

  it('should reject dangerous protocols in query params', () => {
    expect(sanitizeUrl('https://example.com?redirect=javascript:alert(1)')).toBe('');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeUrl(null as any)).toBe('');
    expect(sanitizeUrl(undefined as any)).toBe('');
    expect(sanitizeUrl(123 as any)).toBe('');
  });

  it('should handle invalid URLs', () => {
    expect(sanitizeUrl('not a url')).toBe('');
    expect(sanitizeUrl('ht!tp://example.com')).toBe('');
  });

  it('should preserve query parameters and fragments', () => {
    expect(sanitizeUrl('example.com/path?query=value#fragment')).toBe('https://example.com/path?query=value#fragment');
  });
});

describe('sanitizeUsername', () => {
  it('should accept valid usernames', () => {
    expect(sanitizeUsername('testuser')).toBe('testuser');
    expect(sanitizeUsername('test_user')).toBe('test_user');
    expect(sanitizeUsername('test-user')).toBe('test-user');
    expect(sanitizeUsername('TestUser123')).toBe('TestUser123');
  });

  it('should remove invalid characters', () => {
    expect(sanitizeUsername('test user')).toBe('testuser');
    expect(sanitizeUsername('test.user')).toBe('testuser');
    expect(sanitizeUsername('test@user')).toBe('testuser');
    expect(sanitizeUsername('test#user')).toBe('testuser');
  });

  it('should trim whitespace', () => {
    expect(sanitizeUsername('  testuser  ')).toBe('testuser');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeUsername(null as any)).toBe('');
    expect(sanitizeUsername(undefined as any)).toBe('');
    expect(sanitizeUsername(123 as any)).toBe('');
  });

  it('should handle empty string', () => {
    expect(sanitizeUsername('')).toBe('');
  });

  it('should handle strings with only invalid characters', () => {
    expect(sanitizeUsername('!@#$%')).toBe('');
  });
});

describe('sanitizeEmail', () => {
  it('should trim and lowercase email', () => {
    expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    expect(sanitizeEmail('Test@Example.Com')).toBe('test@example.com');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeEmail(null as any)).toBe('');
    expect(sanitizeEmail(undefined as any)).toBe('');
    expect(sanitizeEmail(123 as any)).toBe('');
  });

  it('should handle empty string', () => {
    expect(sanitizeEmail('')).toBe('');
  });
});

describe('sanitizeName', () => {
  it('should remove HTML tags', () => {
    expect(sanitizeName('<p>John</p>')).toBe('John');
  });

  it('should trim whitespace', () => {
    expect(sanitizeName('  John Doe  ')).toBe('John Doe');
  });

  it('should truncate to max length', () => {
    const longName = 'a'.repeat(150);
    const result = sanitizeName(longName, 100);
    expect(result.length).toBe(100);
  });

  it('should use default max length of 100', () => {
    const longName = 'a'.repeat(150);
    const result = sanitizeName(longName);
    expect(result.length).toBe(100);
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeName(null as any)).toBe('');
    expect(sanitizeName(undefined as any)).toBe('');
    expect(sanitizeName(123 as any)).toBe('');
  });

  it('should handle empty string', () => {
    expect(sanitizeName('')).toBe('');
  });
});

describe('sanitizeBio', () => {
  it('should sanitize HTML', () => {
    const input = '<script>alert(1)</script><p>My bio</p>';
    const result = sanitizeBio(input);
    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>');
  });

  it('should truncate to max length', () => {
    const longBio = 'a'.repeat(600);
    const result = sanitizeBio(longBio, 500);
    expect(result.length).toBe(500);
  });

  it('should use default max length of 500', () => {
    const longBio = 'a'.repeat(600);
    const result = sanitizeBio(longBio);
    expect(result.length).toBe(500);
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeBio(null as any)).toBe('');
    expect(sanitizeBio(undefined as any)).toBe('');
    expect(sanitizeBio(123 as any)).toBe('');
  });

  it('should handle empty string', () => {
    expect(sanitizeBio('')).toBe('');
  });
});

describe('sanitizeLinkTitle', () => {
  it('should remove HTML tags', () => {
    expect(sanitizeLinkTitle('<p>My Link</p>')).toBe('My Link');
  });

  it('should trim whitespace', () => {
    expect(sanitizeLinkTitle('  My Link  ')).toBe('My Link');
  });

  it('should truncate to max length', () => {
    const longTitle = 'a'.repeat(150);
    const result = sanitizeLinkTitle(longTitle, 100);
    expect(result.length).toBe(100);
  });

  it('should use default max length of 100', () => {
    const longTitle = 'a'.repeat(150);
    const result = sanitizeLinkTitle(longTitle);
    expect(result.length).toBe(100);
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeLinkTitle(null as any)).toBe('');
    expect(sanitizeLinkTitle(undefined as any)).toBe('');
    expect(sanitizeLinkTitle(123 as any)).toBe('');
  });

  it('should handle empty string', () => {
    expect(sanitizeLinkTitle('')).toBe('');
  });
});

describe('sanitizeAvatarUrl', () => {
  it('should accept valid HTTP/HTTPS URLs', () => {
    expect(sanitizeAvatarUrl('https://example.com/avatar.jpg')).toBe('https://example.com/avatar.jpg');
    expect(sanitizeAvatarUrl('http://example.com/avatar.png')).toBe('http://example.com/avatar.png');
  });

  it('should return empty string for empty input', () => {
    expect(sanitizeAvatarUrl('')).toBe('');
    expect(sanitizeAvatarUrl('   ')).toBe('');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeAvatarUrl(null as any)).toBe('');
    expect(sanitizeAvatarUrl(undefined as any)).toBe('');
    expect(sanitizeAvatarUrl(123 as any)).toBe('');
  });

  it('should reject non-HTTP/HTTPS protocols', () => {
    expect(sanitizeAvatarUrl('ftp://example.com/avatar.jpg')).toBe('');
    expect(sanitizeAvatarUrl('file:///avatar.jpg')).toBe('');
  });

  it('should reject invalid URLs', () => {
    expect(sanitizeAvatarUrl('not a url')).toBe('');
  });
});

describe('escapeHtml', () => {
  it('should escape ampersand', () => {
    expect(escapeHtml('A & B')).toBe('A & B');
  });

  it('should escape less than', () => {
    expect(escapeHtml('A < B')).toBe('A < B');
  });

  it('should escape greater than', () => {
    expect(escapeHtml('A > B')).toBe('A > B');
  });

  it('should escape double quote', () => {
    expect(escapeHtml('A " B')).toBe('A " B');
  });

  it('should escape single quote', () => {
    expect(escapeHtml("A ' B")).toBe('A &#039; B');
  });

  it('should escape multiple special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('<script>alert("xss")</script>');
  });

  it('should return empty string for non-string input', () => {
    expect(escapeHtml(null as any)).toBe('');
    expect(escapeHtml(undefined as any)).toBe('');
    expect(escapeHtml(123 as any)).toBe('');
  });

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('escapeJs', () => {
  it('should escape backslash', () => {
    expect(escapeJs('A\\B')).toBe('A\\\\B');
  });

  it('should escape double quote', () => {
    expect(escapeJs('A"B')).toBe('A\\"B');
  });

  it('should escape single quote', () => {
    expect(escapeJs("A'B")).toBe("A\\'B");
  });

  it('should escape null character', () => {
    expect(escapeJs('A\x00B')).toBe('A\\0B');
  });

  it('should return empty string for non-string input', () => {
    expect(escapeJs(null as any)).toBe('');
    expect(escapeJs(undefined as any)).toBe('');
    expect(escapeJs(123 as any)).toBe('');
  });

  it('should handle empty string', () => {
    expect(escapeJs('')).toBe('');
  });
});

describe('isSafeString', () => {
  it('should return true for safe strings', () => {
    expect(isSafeString('Hello world')).toBe(true);
    expect(isSafeString('Safe content')).toBe(true);
    expect(isSafeString('')).toBe(true);
  });

  it('should return false for strings with script tags', () => {
    expect(isSafeString('<script>alert(1)</script>')).toBe(false);
    expect(isSafeString('<SCRIPT>alert(1)</SCRIPT>')).toBe(false);
  });

  it('should return false for strings with javascript: protocol', () => {
    expect(isSafeString('javascript:alert(1)')).toBe(false);
    expect(isSafeString('JAVASCRIPT:alert(1)')).toBe(false);
  });

  it('should return false for strings with event handlers', () => {
    expect(isSafeString('onclick="alert(1)"')).toBe(false);
    expect(isSafeString('onmouseover="alert(1)"')).toBe(false);
  });

  it('should return false for strings with data: protocol', () => {
    expect(isSafeString('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('should return false for strings with vbscript: protocol', () => {
    expect(isSafeString('vbscript:msgbox(1)')).toBe(false);
  });

  it('should return false for strings with iframe tags', () => {
    expect(isSafeString('<iframe src="evil.com"></iframe>')).toBe(false);
  });

  it('should return false for strings with object tags', () => {
    expect(isSafeString('<object data="evil.swf"></object>')).toBe(false);
  });

  it('should return false for strings with embed tags', () => {
    expect(isSafeString('<embed src="evil.swf">')).toBe(false);
  });

  it('should return false for strings with form tags', () => {
    expect(isSafeString('<form><input></form>')).toBe(false);
  });

  it('should return false for non-string input', () => {
    expect(isSafeString(null as any)).toBe(false);
    expect(isSafeString(undefined as any)).toBe(false);
    expect(isSafeString(123 as any)).toBe(false);
  });
});

describe('sanitizeObject', () => {
  it('should sanitize string values', () => {
    const input = {
      name: '<script>alert(1)</script>John',
      email: 'test@example.com',
    };
    const result = sanitizeObject(input);
    expect(result.name).toBe('John');
    expect(result.email).toBe('test@example.com');
  });

  it('should recursively sanitize nested objects', () => {
    const input = {
      user: {
        name: '<script>alert(1)</script>John',
        profile: {
          bio: '<p>My bio</p>',
        },
      },
    };
    const result = sanitizeObject(input);
    expect(result.user.name).toBe('John');
    expect(result.user.profile.bio).toBe('My bio');
  });

  it('should keep non-string values as-is', () => {
    const input = {
      name: 'John',
      age: 30,
      active: true,
      tags: ['tag1', 'tag2'],
    };
    const result = sanitizeObject(input);
    expect(result.name).toBe('John');
    expect(result.age).toBe(30);
    expect(result.active).toBe(true);
    expect(result.tags).toEqual(['tag1', 'tag2']);
  });

  it('should handle arrays of objects', () => {
    const input = {
      users: [
        { name: '<script>alert(1)</script>John' },
        { name: 'Jane' },
      ],
    };
    const result = sanitizeObject(input);
    expect(result.users[0].name).toBe('John');
    expect(result.users[1].name).toBe('Jane');
  });

  it('should handle empty object', () => {
    const result = sanitizeObject({});
    expect(result).toEqual({});
  });

  it('should handle null values', () => {
    const input = {
      name: 'John',
      email: null,
    };
    const result = sanitizeObject(input);
    expect(result.name).toBe('John');
    expect(result.email).toBe(null);
  });
});
