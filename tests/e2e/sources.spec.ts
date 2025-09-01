// tests/e2e/sources.spec.ts
import { test, expect } from '@playwright/test';

// Mocked API response with multiple sources
const mockedAudit = {
  truth_score: 7.1,
  bias_patterns: ["selective evidence"],
  missing_angles: ["counter-arguments"],
  citations: [
    "https://www.reuters.com/world/europe/sample-article",
    "https://www.nytimes.com/2025/08/30/world/sample.html",
    "https://www.bbc.co.uk/news/world-sample",
    "https://www.axios.com/2025/08/30/sample",
    "https://www.politico.com/news/2025/08/30/sample-article-001",
    "https://www.euronews.com/2025/08/30/sample",
    "https://www.spiegel.de/ausland/sample-a-12345.html",
    "https://www.elpais.com/internacional/sample.html"
  ],
  summary: "Sample summary for testing purposes.",
  confidence_level: 0.85,
  manipulation_tactics: [],
  fact_check_results: [],
  // Explicit sources to speed up UI mapping (API also computes these)
  sources: [
    { url: "https://www.reuters.com/world/europe/sample-article", outlet: "Reuters" },
    { url: "https://www.nytimes.com/2025/08/30/world/sample.html", outlet: "New York Times" },
    { url: "https://www.bbc.co.uk/news/world-sample", outlet: "BBC News" },
    { url: "https://www.axios.com/2025/08/30/sample", outlet: "Axios" },
    { url: "https://www.politico.com/news/2025/08/30/sample-article-001", outlet: "Politico" },
    { url: "https://www.euronews.com/2025/08/30/sample", outlet: "Euronews" },
    { url: "https://www.spiegel.de/ausland/sample-a-12345.html", outlet: "Der Spiegel" },
    { url: "https://www.elpais.com/internacional/sample.html", outlet: "El País" }
  ]
};

test.describe('Sources card', () => {
  test('renders clean outlet names and supports Show More', async ({ page }) => {
    // Intercept the API call before navigation
    await page.route('**/api/reality-audit', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(mockedAudit),
        });
        return;
      }
      route.fallback();
    });

    // Go to demo page (no auth gate)
    await page.goto('/demo-test');

    // Click Try Demo to auto-fill content and trigger the audit
    await page.getByRole('button', { name: 'Try Demo' }).click();

    // Expect key outlets to be visible (defaults to 5 visible)
    await expect(page.getByText('Reuters')).toBeVisible();
    await expect(page.getByText('New York Times')).toBeVisible();
    await expect(page.getByText('BBC News')).toBeVisible();

    // With >5 sources, Show More should appear; click it
    const showMore = page.getByRole('button', { name: /Show More/ });
    await expect(showMore).toBeVisible();
    await showMore.click();

    // Additional outlets should now be visible
    await expect(page.getByText('Der Spiegel')).toBeVisible();
    await expect(page.getByText('El País')).toBeVisible();
  });
});

