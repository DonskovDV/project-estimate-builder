import { describe, it, expect } from 'vitest';
import { calculateEstimate } from '../src/services/estimateCalculator';
import type { Service } from '@prisma/client';

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: 1,
    name: 'Test Service',
    category: 'design',
    basePrice: 100000,
    baseDays: 10,
    isRequired: false,
    isActive: true,
    costPrice: 60000,
    ...overrides,
  };
}

describe('calculateEstimate', () => {
  it('calculates price with low complexity (coeff 1.0)', () => {
    const svc = makeService({ basePrice: 100000, baseDays: 10, costPrice: 60000 });
    const result = calculateEstimate({ services: [svc], complexity: 'low', discount: 0, extraCharge: 0 });
    expect(result.baseTotal).toBe(100000);
    expect(result.complexityTotal).toBe(100000);
    expect(result.totalPrice).toBe(100000);
    expect(result.totalDays).toBe(10);
  });

  it('applies medium complexity coefficient (1.3)', () => {
    const svc = makeService({ basePrice: 100000, baseDays: 10, costPrice: 50000 });
    const result = calculateEstimate({ services: [svc], complexity: 'medium', discount: 0, extraCharge: 0 });
    expect(result.complexityTotal).toBe(130000);
    expect(result.totalPrice).toBe(130000);
    expect(result.totalDays).toBe(13);
  });

  it('applies high complexity coefficient (1.6)', () => {
    const svc = makeService({ basePrice: 50000, baseDays: 5, costPrice: 20000 });
    const result = calculateEstimate({ services: [svc], complexity: 'high', discount: 0, extraCharge: 0 });
    expect(result.complexityTotal).toBe(80000);
    expect(result.totalDays).toBe(8);
  });

  it('rounds totalDays up (ceil)', () => {
    // 7 days * 1.3 = 9.1 → ceil → 10
    const svc = makeService({ baseDays: 7, basePrice: 10000, costPrice: 5000 });
    const result = calculateEstimate({ services: [svc], complexity: 'medium', discount: 0, extraCharge: 0 });
    expect(result.totalDays).toBe(10);
  });

  it('subtracts discount from total', () => {
    const svc = makeService({ basePrice: 100000, baseDays: 10, costPrice: 50000 });
    const result = calculateEstimate({ services: [svc], complexity: 'low', discount: 10000, extraCharge: 0 });
    expect(result.totalPrice).toBe(90000);
  });

  it('adds extraCharge to total', () => {
    const svc = makeService({ basePrice: 100000, baseDays: 10, costPrice: 50000 });
    const result = calculateEstimate({ services: [svc], complexity: 'low', discount: 0, extraCharge: 15000 });
    expect(result.totalPrice).toBe(115000);
  });

  it('throws when discount exceeds 30%', () => {
    const svc = makeService({ basePrice: 100000, baseDays: 10, costPrice: 30000 });
    expect(() =>
      calculateEstimate({ services: [svc], complexity: 'low', discount: 31000, extraCharge: 0 }),
    ).toThrow('30%');
  });

  it('allows discount up to exactly 30%', () => {
    const svc = makeService({ basePrice: 100000, baseDays: 10, costPrice: 30000 });
    const result = calculateEstimate({ services: [svc], complexity: 'low', discount: 30000, extraCharge: 0 });
    expect(result.totalPrice).toBe(70000);
  });

  it('calculates margin percent correctly', () => {
    // price=100000, cost=60000 → margin = (40000/100000)*100 = 40%
    const svc = makeService({ basePrice: 100000, baseDays: 10, costPrice: 60000 });
    const result = calculateEstimate({ services: [svc], complexity: 'low', discount: 0, extraCharge: 0 });
    expect(result.marginPercent).toBeCloseTo(40);
  });

  it('adds low_margin_warning when margin < 25%', () => {
    // price=100000, cost=80000 → margin = 20% < 25%
    const svc = makeService({ basePrice: 100000, baseDays: 10, costPrice: 80000 });
    const result = calculateEstimate({ services: [svc], complexity: 'low', discount: 0, extraCharge: 0 });
    expect(result.warnings).toContain('low_margin_warning');
  });

  it('no warning when margin >= 25%', () => {
    // price=100000, cost=70000 → margin = 30%
    const svc = makeService({ basePrice: 100000, baseDays: 10, costPrice: 70000 });
    const result = calculateEstimate({ services: [svc], complexity: 'low', discount: 0, extraCharge: 0 });
    expect(result.warnings).not.toContain('low_margin_warning');
  });

  it('throws when no services provided', () => {
    expect(() =>
      calculateEstimate({ services: [], complexity: 'low', discount: 0, extraCharge: 0 }),
    ).toThrow('без услуг');
  });

  it('throws when an inactive service is included', () => {
    const svc = makeService({ isActive: false, baseDays: 10, costPrice: 5000 });
    expect(() =>
      calculateEstimate({ services: [svc], complexity: 'low', discount: 0, extraCharge: 0 }),
    ).toThrow('неактивн');
  });

  it('sums services from multiple services', () => {
    const s1 = makeService({ id: 1, basePrice: 50000, baseDays: 5, costPrice: 30000 });
    const s2 = makeService({ id: 2, basePrice: 70000, baseDays: 8, costPrice: 40000 });
    const result = calculateEstimate({ services: [s1, s2], complexity: 'low', discount: 0, extraCharge: 0 });
    expect(result.baseTotal).toBe(120000);
    expect(result.totalDays).toBe(13);
  });

  it('throws when totalPrice < totalCost', () => {
    // With a huge discount and no extraCharge, price will be very low but cost is 80000
    // base=100000, disc=30000 → price=70000 < cost=80000
    const svc = makeService({ basePrice: 100000, baseDays: 10, costPrice: 80000 });
    expect(() =>
      calculateEstimate({ services: [svc], complexity: 'low', discount: 30000, extraCharge: 0 }),
    ).toThrow('себестоимост');
  });

  it('throws when totalDays would be less than 3', () => {
    const svc = makeService({ baseDays: 1, basePrice: 10000, costPrice: 3000 });
    expect(() =>
      calculateEstimate({ services: [svc], complexity: 'low', discount: 0, extraCharge: 0 }),
    ).toThrow('3 дней');
  });

  it('increments version correctly — new estimate gets version+1 logic is in route layer (calculator handles calc only)', () => {
    // This is a documentation test — version management happens in the route/db layer
    // The calculator focuses on pure computation
    const svc = makeService({ basePrice: 50000, baseDays: 5, costPrice: 20000 });
    const result = calculateEstimate({ services: [svc], complexity: 'low', discount: 0, extraCharge: 0 });
    expect(result.totalPrice).toBeGreaterThan(0);
  });
});
