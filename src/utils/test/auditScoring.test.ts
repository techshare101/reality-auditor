import { describe, it, expect } from 'vitest';
import {
  calculateDynamicConfidence,
  ClaimResult,
  getConfidenceStyle,
  getConfidenceBadge
} from '../auditScoring';

describe('Dynamic Confidence Calculation', () => {
  it('should calculate confidence correctly for mixed claim statuses', () => {
    const claims: ClaimResult[] = [
      // Verified claims
      {
        claim: 'Claim 1',
        verdict: 'true',
        evidence: 'https://example.com/evidence1',
        citation: 'https://example.com/citation1',
        status: 'verified'
      },
      {
        claim: 'Claim 2',
        verdict: 'false',
        evidence: 'https://example.com/evidence2',
        citation: 'https://example.com/citation2',
        status: 'verified'
      },
      // Partial claims
      {
        claim: 'Claim 3',
        verdict: 'misleading',
        evidence: 'https://example.com/evidence3',
        citation: 'https://example.com/citation3',
        status: 'partial'
      },
      // Unverified claims
      {
        claim: 'Claim 4',
        verdict: 'unverified',
        evidence: '',
        status: 'unverified'
      }
    ];

    const confidence = calculateDynamicConfidence(claims);
    expect(confidence).toBeGreaterThanOrEqual(40);
    expect(confidence).toBeLessThanOrEqual(95);
    
    // With 2 verified (1.0 each) and 1 partial (0.5), out of 4 total
    // Ratio = (2 + 0.5 * 1) / 4 = 0.625
    // Confidence = 40 + 0.625 * 55 ≈ 74
    expect(confidence).toBe(74);
  });

  it('should handle empty claims list', () => {
    const confidence = calculateDynamicConfidence([]);
    expect(confidence).toBe(50);
  });

  it('should provide highest confidence for all verified claims', () => {
    const claims: ClaimResult[] = [
      {
        claim: 'Claim 1',
        verdict: 'true',
        evidence: 'https://example.com/evidence1',
        citation: 'https://example.com/citation1',
        status: 'verified'
      },
      {
        claim: 'Claim 2',
        verdict: 'false',
        evidence: 'https://example.com/evidence2',
        citation: 'https://example.com/citation2',
        status: 'verified'
      }
    ];

    const confidence = calculateDynamicConfidence(claims);
    expect(confidence).toBe(95); // Maximum confidence
  });

  it('should provide lowest confidence for all unverified claims', () => {
    const claims: ClaimResult[] = [
      {
        claim: 'Claim 1',
        verdict: 'unverified',
        evidence: '',
        status: 'unverified'
      },
      {
        claim: 'Claim 2',
        verdict: 'unverified',
        evidence: '',
        status: 'unverified'
      }
    ];

    const confidence = calculateDynamicConfidence(claims);
    expect(confidence).toBe(40); // Minimum confidence
  });
});

describe('Confidence Display Helpers', () => {
  it('should return correct styles for high confidence', () => {
    const style = getConfidenceStyle(85);
    expect(style.icon).toBe('🟢');
    expect(style.label).toBe('High Confidence');
    expect(style.color).toContain('green');
  });

  it('should return correct styles for medium confidence', () => {
    const style = getConfidenceStyle(65);
    expect(style.icon).toBe('🟡');
    expect(style.label).toBe('Medium Confidence');
    expect(style.color).toContain('yellow');
  });

  it('should return correct styles for low confidence', () => {
    const style = getConfidenceStyle(45);
    expect(style.icon).toBe('🔴');
    expect(style.label).toBe('Low Confidence');
    expect(style.color).toContain('red');
  });

  it('should return correct badge strings', () => {
    expect(getConfidenceBadge(85)).toBe('🟢 High');
    expect(getConfidenceBadge(65)).toBe('🟡 Medium');
    expect(getConfidenceBadge(45)).toBe('🔴 Low');
  });
});