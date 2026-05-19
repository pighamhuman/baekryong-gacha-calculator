const { test, expect } = require('@playwright/test');

test('백룡 수호석 BM 계산기 기본 검증', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('http://127.0.0.1:4173/baekryong_guardian_bm_calculator_codex_final.html');
  await expect(page.getByRole('heading', { name: '백룡 수호석 BM 계산기' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('NaN');
  await expect(page.locator('body')).not.toContainText('Infinity');
  await expect(page.locator('body')).not.toContainText('undefined');
  await expect(page.locator('body')).not.toContainText('null');
  expect(errors).toEqual([]);
});
