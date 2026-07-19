import { getMsUntilNextScheduledRun, formatDuration, nowEAT, formatEAT } from './time';

describe('Time Utilities', () => {
  describe('getMsUntilNextScheduledRun', () => {
    it('should return a positive number of milliseconds', () => {
      const ms = getMsUntilNextScheduledRun(8, 30);
      expect(ms).toBeGreaterThan(0);
    });

    it('should be less than 24 hours', () => {
      const ms = getMsUntilNextScheduledRun(8, 30);
      expect(ms).toBeLessThan(24 * 60 * 60 * 1000);
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(1500)).toBe('1.5s');
    });

    it('should format minutes', () => {
      expect(formatDuration(125_000)).toBe('2m 5s');
    });
  });

  describe('nowEAT', () => {
    it('should return a Date object', () => {
      const date = nowEAT();
      expect(date).toBeInstanceOf(Date);
    });
  });

  describe('formatEAT', () => {
    it('should format a date string', () => {
      const date = new Date('2024-06-15T10:30:00Z');
      const formatted = formatEAT(date);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });
});
