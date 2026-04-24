import { describe, it, expect } from 'vitest';
import { calculatePercentage } from '../src/calculate-percentage';

describe('calculatePercentage', () => {
  it('should return 0 if the total is 0', () => {
    const result = calculatePercentage(10, 0);

    expect(result).toBe(0);
  });

  it('should return 0 if the total is less than 0', () => {
    const result = calculatePercentage(10, -10);

    expect(result).toBe(0);
  });

  it('should return the correct percentage if the current is greater than the total', () => {
    const result1 = calculatePercentage(10, 10);
    const result2 = calculatePercentage(10, 100);

    expect(result1).toBe(100);
    expect(result2).toBe(10);
  });

  it('should return the percentage including the tenth place (when appropriate)', () => {
    const result = calculatePercentage(105, 1000);

    expect(result).toBe(10.5);
  });

  it('should return the percentage including the hundredth place (when appropriate)', () => {
    const result = calculatePercentage(1005, 10000);

    expect(result).toBe(10.05);
  });
});
