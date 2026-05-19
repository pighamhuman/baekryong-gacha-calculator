const { test, expect } = require('@playwright/test');

const APP = 'http://127.0.0.1:4173/baekryong_guardian_bm_calculator_codex_final.html';
const banned = ['행운','공격속도','공속','중독강화','중독회복','민첩','정확','추가대미지','마법회피%','최대HP(하위)','최대MP(하위)'];

async function readText(page, selector) {
  return (await page.locator(selector).innerText()).trim();
}

async function readNumberText(page, selector) {
  return (await readText(page, selector)).replace(/,/g, '');
}

function assertNotBlocked(value, label) {
  if (!value || value.includes('계산 차단') || value.includes('정확 계산 한도 초과')) {
    throw new Error(`[실패] ${label} 값이 유효하지 않습니다: ${value}`);
  }
}

test.describe('백룡 수호석 BM 계산기 QA', () => {
  test('기본 로딩/데이터/슬롯 동작 검증', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

    await test.step('페이지 로딩 및 기본 텍스트 확인', async () => {
      await page.goto(APP);
      await expect(page.getByRole('heading', { name: '백룡 수호석 BM 계산기' })).toBeVisible();
      await expect(page.locator('#badge')).toContainText('티어 총량 합계: 100.0000%');
      await expect(page.locator('#badge')).toContainText('옵션 확률 합계: 100.000000%');
    });

    await test.step('금지 문자열 및 금지 옵션 확인', async () => {
      const body = page.locator('body');
      for (const t of ['NaN', 'Infinity', 'undefined', 'null']) await expect(body).not.toContainText(t);
      for (const name of banned) await expect(body).not.toContainText(name);
      await expect(body).toContainText('치명타피해%');
      await expect(body).toContainText('공력피해감소%');
      await expect(page.locator('#slots .slot')).toHaveCount(3);
    });

    await test.step('3슬롯 시나리오 A/B/C/D 검증', async () => {
      await page.locator('#slots .slot').nth(0).locator('select').nth(0).selectOption({ label: '파괴' });
      await page.locator('#slots .slot').nth(0).locator('select').nth(1).selectOption('max');
      await page.locator('#slots .slot').nth(1).locator('select').nth(0).selectOption({ label: '마력' });
      await page.locator('#slots .slot').nth(1).locator('select').nth(1).selectOption('target');
      await page.locator('#slots .slot').nth(2).locator('select').nth(0).selectOption({ label: '경험치증가%' });
      await page.locator('#slots .slot').nth(2).locator('select').nth(1).selectOption('target');

      assertNotBlocked(await readText(page, '#expCost'), '시나리오 A 완성 기대비용');
      assertNotBlocked(await readText(page, '#doneProb'), '시나리오 A 완성 확률');

      await page.locator('#slots .slot').nth(2).getByRole('checkbox').check();
      await expect(page.locator('#curCost')).toContainText('1,500원');
      await expect(page.locator('#remain')).toContainText('2개');

      await page.locator('#slots .slot').nth(0).getByRole('checkbox').check();
      await page.locator('#slots .slot').nth(1).getByRole('checkbox').check();
      await expect(page.locator('#curCost')).toContainText('리롤 불가');

      await page.locator('#slots .slot').nth(0).getByRole('checkbox').uncheck();
      await page.locator('#slots .slot').nth(1).getByRole('checkbox').uncheck();
      await page.locator('#slots .slot').nth(2).getByRole('checkbox').uncheck();
    });

    await test.step('예산/편집/ON-OFF/비용 변경 연동 검증', async () => {
      // 예산 변화가 화면 반올림으로 숨지지 않도록 확률이 비교적 큰 조건으로 전환 후 검증
      await page.locator('#slots .slot').nth(0).locator('select').nth(0).selectOption({ label: '힘' });
      await page.locator('#slots .slot').nth(0).locator('select').nth(1).selectOption('appear');
      await page.locator('#slots .slot').nth(1).locator('select').nth(0).selectOption({ label: '지능' });
      await page.locator('#slots .slot').nth(1).locator('select').nth(1).selectOption('appear');
      await page.locator('#slots .slot').nth(2).locator('select').nth(0).selectOption({ label: '인내' });
      await page.locator('#slots .slot').nth(2).locator('select').nth(1).selectOption('appear');

      await page.locator('#budget').fill('100000');
      const prob1Text = await readNumberText(page, '#doneProb');
      await page.locator('#budget').fill('1000000');
      const prob2Text = await readNumberText(page, '#doneProb');

      const prob1 = Number(prob1Text.replace('%', ''));
      const prob2 = Number(prob2Text.replace('%', ''));
      if (!Number.isFinite(prob1) || !Number.isFinite(prob2)) {
        throw new Error(`[실패] 예산 변경 확률 파싱 오류: before=${prob1Text}, after=${prob2Text}`);
      }
      if (prob2 < prob1) {
        throw new Error(`[실패] 예산 증가 후 완성 확률이 감소했습니다: before=${prob1Text}, after=${prob2Text}`);
      }

      await page.locator('#tbody tr', { hasText: '파괴' }).click();
      const before = await page.locator('#tbody tr', { hasText: '파괴' }).innerText();
      const maxInput = page.locator('#edit label:has-text("Max") input');
      await maxInput.fill('20');
      await maxInput.blur();
      await expect(page.locator('#tbody tr', { hasText: '파괴' })).toContainText('1~20');
      const after = await page.locator('#tbody tr', { hasText: '파괴' }).innerText();
      if (before === after) throw new Error('[실패] 파괴 Max 변경이 표에 반영되지 않았습니다.');

      await page.locator('#edit label:has-text("목표 기준값") input').fill('15');
      await page.locator('#edit label:has-text("가중치") input').fill('2');
      await page.locator('#edit label:has-text("ON/OFF") select').selectOption('false');
      await expect(page.locator('#expCost')).toContainText('계산 차단');
      await page.locator('#edit label:has-text("ON/OFF") select').selectOption('true');

      const beforeCostProb = await readNumberText(page, '#doneProb');
      await page.locator('#costInputs label:has-text("잠금 0개") input').fill('1200');
      const afterCostProb = await readNumberText(page, '#doneProb');
      if (beforeCostProb === afterCostProb) throw new Error('[실패] 리롤 비용 변경 후 완성 확률이 갱신되지 않았습니다.');

      await page.getByRole('button', { name: 'CSV 내보내기' }).click();
      await page.getByRole('button', { name: 'JSON 내보내기' }).click();
    });

    await test.step('최종 콘솔 오류 검증', async () => {
      if (consoleErrors.length > 0) throw new Error(`[실패] 브라우저 콘솔 오류 발견: ${consoleErrors.join(' | ')}`);
    });
  });
});
