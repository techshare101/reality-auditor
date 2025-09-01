// tests/e2e/storage-restore.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Storage-based restore', () => {
  test('restores audit data when storage event is dispatched', async ({ page }) => {
    // Go to demo-test which mounts RealityAuditorApp without auth
    await page.goto('/demo-test');

    // Ensure app is mounted
    await expect(page.getByText('Reality Auditor')).toBeVisible();

    const payload = {
      url: 'https://example.com/original-article',
      result: {
        truth_score: 8.3,
        bias_patterns: ['loaded language'],
        missing_angles: ['historical context'],
        citations: ['https://www.reuters.com/world/sample'],
        summary: 'Restored summary via storage event.',
        confidence_level: 0.9,
        warnings: ['Test restore payload'],
        manipulation_tactics: ['emotional framing'],
        fact_check_results: [
          { claim: 'Sample claim', verdict: 'true', evidence: 'Sample evidence' }
        ],
        sources: [
          { url: 'https://www.reuters.com/world/sample', outlet: 'Reuters' },
          { url: 'https://www.nytimes.com/2025/08/30/world/sample.html', outlet: 'New York Times' },
          { url: 'https://example.org/info', outlet: 'Example Org' }
        ]
      }
    };

    // Dispatch the storage event inside the page
    await page.evaluate((p) => {
      localStorage.setItem('realityauditor:restore', JSON.stringify(p));
      window.dispatchEvent(new StorageEvent('storage', { key: 'realityauditor:restore', newValue: JSON.stringify(p) }));
    }, payload);

    // Expect the restored results to render
    await expect(page.getByText('Audit Summary')).toBeVisible();
    await expect(page.getByText('Restored summary via storage event.')).toBeVisible();
    await expect(page.getByText('Truth Score')).toBeVisible();

    // Verify a known outlet from sources shows up
    await expect(page.getByText('New York Times')).toBeVisible();
  });
});

