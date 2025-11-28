import { describe, it, expect } from 'vitest';
import { normalizeHash } from '../../lib/authUtils';

describe('authUtils', () => {
  describe('normalizeHash', () => {
    it('should return empty string for empty hash', () => {
      expect(normalizeHash('')).toBe('');
    });

    it('should remove leading # from hash', () => {
      expect(normalizeHash('#access_token=abc&type=recovery')).toBe('access_token=abc&type=recovery');
    });

    it('should handle hash with extra slash prefix (#/)', () => {
      expect(normalizeHash('#/access_token=abc&type=recovery')).toBe('access_token=abc&type=recovery');
    });

    it('should handle hash with double slash prefix (#//)', () => {
      expect(normalizeHash('#//access_token=abc&type=recovery')).toBe('access_token=abc&type=recovery');
    });

    it('should handle hash with multiple leading slashes', () => {
      expect(normalizeHash('#///access_token=abc&type=recovery')).toBe('access_token=abc&type=recovery');
    });

    it('should handle hash without # prefix', () => {
      expect(normalizeHash('access_token=abc&type=recovery')).toBe('access_token=abc&type=recovery');
    });

    it('should handle hash with leading slashes but no #', () => {
      expect(normalizeHash('/access_token=abc&type=recovery')).toBe('access_token=abc&type=recovery');
    });

    it('should handle hash with only slashes after #', () => {
      expect(normalizeHash('#/')).toBe('');
    });

    it('should preserve internal slashes in values', () => {
      expect(normalizeHash('#redirect=/dashboard/home')).toBe('redirect=/dashboard/home');
    });

    it('should handle real-world malformed URL format', () => {
      // This is the actual format from the bug report: //#access_token=...
      // When using window.location.hash, the browser returns "#access_token=..." for URL "//#..."
      // But in case the slash leaks through, we handle it
      expect(normalizeHash('#access_token=875820&type=recovery')).toBe('access_token=875820&type=recovery');
    });
  });
});
