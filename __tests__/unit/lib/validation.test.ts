import { describe, it, expect } from 'vitest';
import {
  passwordSchema,
  emailSchema,
  usernameSchema,
  nameSchema,
  bioSchema,
  urlSchema,
  linkTitleSchema,
  avatarUrlSchema,
  themeSchema,
  loginCredentialsSchema,
  signupCredentialsSchema,
  updateProfileSchema,
  addLinkSchema,
  updateLinkSchema,
  reorderLinksSchema,
  generateBioSchema,
  linkIdSchema,
  usernameParamSchema,
  sanitizeHtmlSchema,
} from '@/lib/validation';

describe('passwordSchema', () => {
  it('should accept valid passwords', () => {
    const validPasswords = [
      'Password123!',
      'Secure@Pass456',
      'MyP@ssw0rd',
      'Test#1234',
    ];

    validPasswords.forEach(password => {
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(true);
    });
  });

  it('should reject passwords less than 8 characters', () => {
    const result = passwordSchema.safeParse('Pass1!');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('at least 8 characters');
    }
  });

  it('should reject passwords without uppercase letter', () => {
    const result = passwordSchema.safeParse('password123!');
    expect(result.success).toBe(false);
  });

  it('should reject passwords without lowercase letter', () => {
    const result = passwordSchema.safeParse('PASSWORD123!');
    expect(result.success).toBe(false);
  });

  it('should reject passwords without number', () => {
    const result = passwordSchema.safeParse('Password!');
    expect(result.success).toBe(false);
  });

  it('should reject passwords without special character', () => {
    const result = passwordSchema.safeParse('Password123');
    expect(result.success).toBe(false);
  });

  it('should reject passwords exceeding 128 characters', () => {
    const longPassword = 'A' + 'a1!' + 'x'.repeat(125);
    const result = passwordSchema.safeParse(longPassword);
    expect(result.success).toBe(false);
  });
});

describe('emailSchema', () => {
  it('should accept valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@example.com',
      'user+tag@example.co.uk',
      'user_name@example-domain.com',
    ];

    validEmails.forEach(email => {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(email.toLowerCase());
      }
    });
  });

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      'invalid',
      '@example.com',
      'user@',
      'user@domain',
      'user space@example.com',
    ];

    invalidEmails.forEach(email => {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(false);
    });
  });

  it('should reject empty email', () => {
    const result = emailSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('should reject email exceeding 254 characters', () => {
    const longEmail = 'a'.repeat(250) + '@example.com';
    const result = emailSchema.safeParse(longEmail);
    expect(result.success).toBe(false);
  });

  it('should trim and lowercase email', () => {
    const result = emailSchema.safeParse('  TEST@EXAMPLE.COM  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('test@example.com');
    }
  });
});

describe('usernameSchema', () => {
  it('should accept valid usernames', () => {
    const validUsernames = [
      'testuser',
      'test_user',
      'test-user',
      'TestUser123',
      'user_123',
    ];

    validUsernames.forEach(username => {
      const result = usernameSchema.safeParse(username);
      expect(result.success).toBe(true);
    });
  });

  it('should reject usernames less than 3 characters', () => {
    const result = usernameSchema.safeParse('ab');
    expect(result.success).toBe(false);
  });

  it('should reject usernames exceeding 30 characters', () => {
    const longUsername = 'a'.repeat(31);
    const result = usernameSchema.safeParse(longUsername);
    expect(result.success).toBe(false);
  });

  it('should reject usernames with invalid characters', () => {
    const invalidUsernames = [
      'test user',
      'test.user',
      'test@user',
      'test#user',
      'test/user',
    ];

    invalidUsernames.forEach(username => {
      const result = usernameSchema.safeParse(username);
      expect(result.success).toBe(false);
    });
  });

  it('should trim username', () => {
    const result = usernameSchema.safeParse('  testuser  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('testuser');
    }
  });
});

describe('nameSchema', () => {
  it('should accept valid names', () => {
    const validNames = [
      'John Doe',
      'Jane',
      'O\'Brien',
      'Mary-Jane',
      'José García',
    ];

    validNames.forEach(name => {
      const result = nameSchema.safeParse(name);
      expect(result.success).toBe(true);
    });
  });

  it('should reject empty name', () => {
    const result = nameSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('should reject name exceeding 100 characters', () => {
    const longName = 'a'.repeat(101);
    const result = nameSchema.safeParse(longName);
    expect(result.success).toBe(false);
  });

  it('should trim name', () => {
    const result = nameSchema.safeParse('  John Doe  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('John Doe');
    }
  });
});

describe('bioSchema', () => {
  it('should accept valid bios', () => {
    const validBios = [
      'This is my bio',
      'Developer and designer',
      '',
      null,
    ];

    validBios.forEach(bio => {
      const result = bioSchema.safeParse(bio);
      expect(result.success).toBe(true);
    });
  });

  it('should reject bio exceeding 500 characters', () => {
    const longBio = 'a'.repeat(501);
    const result = bioSchema.safeParse(longBio);
    expect(result.success).toBe(false);
  });

  it('should trim bio', () => {
    const result = bioSchema.safeParse('  My bio  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('My bio');
    }
  });
});

describe('urlSchema', () => {
  it('should accept valid URLs', () => {
    const validUrls = [
      'https://example.com',
      'http://example.com',
      'https://example.com/path',
      'https://example.com?query=value',
      'example.com',
      'www.example.com',
    ];

    validUrls.forEach(url => {
      const result = urlSchema.safeParse(url);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatch(/^https?:\/\//);
      }
    });
  });

  it('should reject dangerous protocols', () => {
    const dangerousUrls = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'ftp://example.com',
    ];

    dangerousUrls.forEach(url => {
      const result = urlSchema.safeParse(url);
      expect(result.success).toBe(false);
    });
  });

  it('should reject empty URL', () => {
    const result = urlSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('should reject URL exceeding 2048 characters', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2030);
    const result = urlSchema.safeParse(longUrl);
    expect(result.success).toBe(false);
  });

  it('should add https:// prefix if missing', () => {
    const result = urlSchema.safeParse('example.com');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('https://example.com');
    }
  });
});

describe('linkTitleSchema', () => {
  it('should accept valid link titles', () => {
    const validTitles = [
      'My Link',
      'Link Title',
      'A',
      'a'.repeat(100),
    ];

    validTitles.forEach(title => {
      const result = linkTitleSchema.safeParse(title);
      expect(result.success).toBe(true);
    });
  });

  it('should reject empty title', () => {
    const result = linkTitleSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('should reject title exceeding 100 characters', () => {
    const longTitle = 'a'.repeat(101);
    const result = linkTitleSchema.safeParse(longTitle);
    expect(result.success).toBe(false);
  });

  it('should trim title', () => {
    const result = linkTitleSchema.safeParse('  My Link  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('My Link');
    }
  });
});

describe('avatarUrlSchema', () => {
  it('should accept valid avatar URLs', () => {
    const validUrls = [
      'https://example.com/avatar.jpg',
      'http://example.com/avatar.png',
      null,
      undefined,
    ];

    validUrls.forEach(url => {
      const result = avatarUrlSchema.safeParse(url);
      expect(result.success).toBe(true);
    });
  });

  it('should reject non-HTTP/HTTPS protocols', () => {
    const invalidUrls = [
      'ftp://example.com/avatar.jpg',
      'file:///avatar.jpg',
    ];

    invalidUrls.forEach(url => {
      const result = avatarUrlSchema.safeParse(url);
      expect(result.success).toBe(false);
    });
  });

  it('should reject URL exceeding 2048 characters', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2030);
    const result = avatarUrlSchema.safeParse(longUrl);
    expect(result.success).toBe(false);
  });
});

describe('themeSchema', () => {
  it('should accept valid themes', () => {
    const validThemes = ['default', 'dark', 'blue', 'purple'];

    validThemes.forEach(theme => {
      const result = themeSchema.safeParse(theme);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid themes', () => {
    const invalidThemes = ['invalid', 'light', 'green', ''];

    invalidThemes.forEach(theme => {
      const result = themeSchema.safeParse(theme);
      expect(result.success).toBe(false);
    });
  });
});

describe('loginCredentialsSchema', () => {
  it('should accept valid login credentials', () => {
    const result = loginCredentialsSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123!',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = loginCredentialsSchema.safeParse({
      email: 'invalid',
      password: 'Password123!',
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = loginCredentialsSchema.safeParse({
      email: 'test@example.com',
      password: '',
    });

    expect(result.success).toBe(false);
  });
});

describe('signupCredentialsSchema', () => {
  it('should accept valid signup credentials', () => {
    const result = signupCredentialsSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123!',
      username: 'testuser',
      full_name: 'Test User',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid password', () => {
    const result = signupCredentialsSchema.safeParse({
      email: 'test@example.com',
      password: 'weak',
      username: 'testuser',
      full_name: 'Test User',
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid username', () => {
    const result = signupCredentialsSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123!',
      username: 'test user',
      full_name: 'Test User',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('should accept valid profile update', () => {
    const result = updateProfileSchema.safeParse({
      username: 'testuser',
      display_name: 'Test User',
      bio: 'My bio',
      theme: 'dark',
      avatar_url: 'https://example.com/avatar.jpg',
    });

    expect(result.success).toBe(true);
  });

  it('should accept partial updates', () => {
    const result = updateProfileSchema.safeParse({
      username: 'testuser',
      display_name: 'Test User',
    });

    expect(result.success).toBe(true);
  });
});

describe('addLinkSchema', () => {
  it('should accept valid link', () => {
    const result = addLinkSchema.safeParse({
      title: 'My Link',
      url: 'https://example.com',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid URL', () => {
    const result = addLinkSchema.safeParse({
      title: 'My Link',
      url: 'javascript:alert(1)',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateLinkSchema', () => {
  it('should accept valid link update', () => {
    const result = updateLinkSchema.safeParse({
      title: 'Updated Link',
      url: 'https://example.com',
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it('should accept partial updates', () => {
    const result = updateLinkSchema.safeParse({
      isActive: false,
    });

    expect(result.success).toBe(true);
  });
});

describe('reorderLinksSchema', () => {
  it('should accept valid link order', () => {
    const result = reorderLinksSchema.safeParse([
      { id: 'link-1', position: 0 },
      { id: 'link-2', position: 1 },
      { id: 'link-3', position: 2 },
    ]);

    expect(result.success).toBe(true);
  });

  it('should reject negative position', () => {
    const result = reorderLinksSchema.safeParse([
      { id: 'link-1', position: -1 },
    ]);

    expect(result.success).toBe(false);
  });

  it('should reject empty link ID', () => {
    const result = reorderLinksSchema.safeParse([
      { id: '', position: 0 },
    ]);

    expect(result.success).toBe(false);
  });
});

describe('generateBioSchema', () => {
  it('should accept valid keywords', () => {
    const result = generateBioSchema.safeParse({
      keywords: 'developer designer creative',
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty keywords', () => {
    const result = generateBioSchema.safeParse({
      keywords: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject keywords exceeding 200 characters', () => {
    const longKeywords = 'a'.repeat(201);
    const result = generateBioSchema.safeParse({
      keywords: longKeywords,
    });

    expect(result.success).toBe(false);
  });

  it('should trim keywords', () => {
    const result = generateBioSchema.safeParse({
      keywords: '  developer designer  ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keywords).toBe('developer designer');
    }
  });
});

describe('linkIdSchema', () => {
  it('should accept valid link IDs', () => {
    const validIds = [
      'link-123',
      'link_456',
      'link789',
      'abc-123_xyz',
    ];

    validIds.forEach(id => {
      const result = linkIdSchema.safeParse(id);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid link IDs', () => {
    const invalidIds = [
      '',
      'link 123',
      'link.123',
      'link@123',
      'link/123',
    ];

    invalidIds.forEach(id => {
      const result = linkIdSchema.safeParse(id);
      expect(result.success).toBe(false);
    });
  });
});

describe('usernameParamSchema', () => {
  it('should accept valid username parameters', () => {
    const validUsernames = [
      'testuser',
      'test_user',
      'test-user',
      'TestUser123',
    ];

    validUsernames.forEach(username => {
      const result = usernameParamSchema.safeParse(username);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid username parameters', () => {
    const invalidUsernames = [
      '',
      'te',
      'a'.repeat(31),
      'test user',
      'test.user',
    ];

    invalidUsernames.forEach(username => {
      const result = usernameParamSchema.safeParse(username);
      expect(result.success).toBe(false);
    });
  });
});

describe('sanitizeHtmlSchema', () => {
  it('should remove dangerous HTML tags', () => {
    const dangerousHtml = '<script>alert("xss")</script><p>Safe content</p>';
    const result = sanitizeHtmlSchema.safeParse(dangerousHtml);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toContain('<script>');
      expect(result.data).toContain('<p>');
    }
  });

  it('should remove inline event handlers', () => {
    const htmlWithEvents = '<div onclick="alert(1)">Content</div>';
    const result = sanitizeHtmlSchema.safeParse(htmlWithEvents);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toContain('onclick');
    }
  });

  it('should remove javascript: protocol', () => {
    const htmlWithJs = '<a href="javascript:alert(1)">Link</a>';
    const result = sanitizeHtmlSchema.safeParse(htmlWithJs);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toContain('javascript:');
    }
  });

  it('should remove data: protocol', () => {
    const htmlWithData = '<img src="data:image/svg+xml,<script>alert(1)</script>">';
    const result = sanitizeHtmlSchema.safeParse(htmlWithData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toContain('data:');
    }
  });
});
