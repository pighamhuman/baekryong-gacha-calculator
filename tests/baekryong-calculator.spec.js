const { test, expect } = require('@playwright/test');

const APP = 'http://127.0.0.1:4173/baekryong_guardian_bm_calculator_codex_final.html';
const banned = ['행운','공격속도','공속','중독강화','중독회복','민첩','정확','추가대미지','마법회피%','최대HP(하위)','최대MP(하위)'];

async function textNum(page, id) {
  return (await page.locator(id).innerText()).replace(/,/g, '');
}

test('백룡 수호석 BM 계산기 검증', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto(APP);

  await expect(page.getByRole('heading', { name: '백룡 수호석 BM 계산기' })).toBeVisible();
  const body = page.locator('body');
  await expect(body).not.toContainText('NaN');
  await expect(body).not.toContainText('Infinity');
  await expect(body).not.toContainText('undefined');
  await expect(body).not.toContainText('null');

  await expect(page.locator('#badge')).toContainText('티어 총량 합계: 100.0000%');
  await expect(page.locator('#badge')).toContainText('옵션 확률 합계: 100.000000%');

  for (const w of banned) await expect(body).not.toContainText(w);
  await expect(body).toContainText('치명타피해%');
  await expect(body).toContainText('공력피해감소%');

  const slotCards = page.locator('#slots .slot');
  await expect(slotCards).toHaveCount(3);

  await page.locator('#slots .slot').nth(0).locator('select').nth(0).selectOption({ label: '파괴' });
  await page.locator('#slots .slot').nth(0).locator('select').nth(1).selectOption('max');
  await page.locator('#slots .slot').nth(1).locator('select').nth(0).selectOption({ label: '마력' });
  await page.locator('#slots .slot').nth(1).locator('select').nth(1).selectOption('target');
  await page.locator('#slots .slot').nth(2).locator('select').nth(0).selectOption({ label: '경험치증가%' });
  await page.locator('#slots .slot').nth(2).locator('select').nth(1).selectOption('target');

  await expect(page.locator('#expCost')).not.toContainText('계산 차단');
  const p1 = await textNum(page, '#doneProb');
  await page.locator('#slots .slot').nth(2).getByRole('checkbox').check();
  await expect(page.locator('#curCost')).toContainText('1,500원');
  await expect(page.locator('#remain')).toContainText('2개');
  await page.locator('#slots .slot').nth(0).getByRole('checkbox').check();
  await page.locator('#slots .slot').nth(1).getByRole('checkbox').check();
  await expect(page.locator('#curCost')).toContainText('리롤 불가');

  await page.locator('#slots .slot').nth(0).getByRole('checkbox').uncheck();
  await page.locator('#slots .slot').nth(1).getByRole('checkbox').uncheck();
  await page.locator('#slots .slot').nth(2).getByRole('checkbox').uncheck();

  await page.locator('#budget').fill('1000000');
  const p2 = await textNum(page, '#doneProb');
  await page.locator('#budget').fill('5000000');
  const p3 = await textNum(page, '#doneProb');
  expect(p2).not.toBe('');
  expect(p2).not.toBe(p3);

  await page.locator('#tbody tr', { hasText: '파괴' }).click();
  const rowBefore = await page.locator('#tbody tr', { hasText: '파괴' }).innerText();
  await page.locator('#edit label:has-text("Max") input').fill('20');
  const rowAfter = await page.locator('#tbody tr', { hasText: '파괴' }).innerText();
  expect(rowBefore).not.toBe(rowAfter);

  await page.locator('#edit label:has-text("목표 기준값") input').fill('15');
  await page.locator('#edit label:has-text("가중치") input').fill('2');
  await page.locator('#edit label:has-text("ON/OFF") select').selectOption('false');
  await expect(page.locator('#expCost')).toContainText('계산 차단');
  await page.locator('#edit label:has-text("ON/OFF") select').selectOption('true');

  const probBeforeCost = await textNum(page, '#doneProb');
  await page.locator('#costInputs label:has-text("잠금 0개") input').fill('1200');
  const probAfterCost = await textNum(page, '#doneProb');
  expect(probBeforeCost).not.toBe(probAfterCost);

  await page.getByRole('button', { name: 'CSV 내보내기' }).click();
  await page.getByRole('button', { name: 'JSON 내보내기' }).click();

  await expect(body).not.toContainText('NaN');
  await expect(body).not.toContainText('Infinity');
  await expect(body).not.toContainText('undefined');
  await expect(body).not.toContainText('null');
  expect(consoleErrors).toEqual([]);
});
