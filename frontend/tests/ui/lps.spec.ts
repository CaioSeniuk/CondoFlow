import { test, expect, type Page } from '@playwright/test';
import type { ProductPlan, UserRole } from '../../lib/types';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
};
const optionalPath = /^\/(reservations|polls|finance)(\/|$)/;

async function setup(page: Page, role: UserRole, initialPlan: ProductPlan, admin = false) {
  let plan = initialPlan;
  const requests: { path: string; method: string; body: unknown }[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('condoflow_access_token', 'test-access');
    localStorage.setItem('condoflow_refresh_token', 'test-refresh');
  });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    const method = request.method();
    const send = (body: unknown, status = 200) => route.fulfill({ headers, json: body, status });
    if (method === 'OPTIONS') return send({});
    requests.push({ path, method, body: request.postData() ? request.postDataJSON() : null });
    if (path === '/users/me') return send({
      id: '1', condominiumId: '1', username: role, firstName: 'Ana', lastName: 'Silva',
      email: 'ana@example.com', role, block: 'A', apartment: '101', phone: '',
      isActive: true, isSuperuser: admin,
      condominium: { id: '1', name: 'Condomínio LPS', productPlan: plan },
    });
    if (path === '/admin/condominiums/1/product-plan' && method === 'PATCH') {
      plan = request.postDataJSON().productPlan;
      return send({ id: '1', name: 'Condomínio LPS', productPlan: plan });
    }
    if (path === '/admin/condominiums' && method === 'POST') {
      plan = request.postDataJSON().productPlan;
      return send({ id: '1', name: 'Condomínio LPS', productPlan: plan, code: 'A'.repeat(32) }, 201);
    }
    if (path === '/admin/condominiums') return send({
      count: 1, previous: null, next: null,
      results: [{ id: '1', name: 'Condomínio LPS', productPlan: plan,
        registrationCode: 'A'.repeat(32), codeUpdatedAt: null }],
    });
    if (plan === 'essential' && optionalPath.test(path)) {
      return send({ message: 'Funcionalidade indisponível no produto deste condomínio.' }, 403);
    }
    return send({ count: 0, previous: null, next: null, results: [] });
  });
  return { requests, changePlan: (value: ProductPlan) => { plan = value; } };
}

for (const role of ['manager', 'resident', 'doorman', 'provider'] as const) {
  test(`essential ${role}: no optional navigation, summaries or activity requests`, async ({ page }) => {
    const api = await setup(page, role, 'essential');
    await page.goto(`/dashboard/${role}`);
    await expect(page.getByText('Condomínio LPS · Produto Essencial', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ações rápidas' })).toBeVisible();
    for (const module of ['reservations', 'common-areas', 'polls', 'finance', 'categories']) {
      await expect(page.locator(`a[href="/dashboard/${module}"]`)).toHaveCount(0);
    }
    await expect(page.getByText('Reservas', { exact: true })).toHaveCount(0);
    await page.goto('/dashboard/history');
    await expect(page.getByRole('heading', { name: 'Histórico geral' })).toBeVisible();
    await expect(page.getByText('Nenhuma atividade encontrada.')).toBeVisible();
    expect(api.requests.some((request) => optionalPath.test(request.path))).toBe(false);
  });
}

test('essential blocks bookmarked optional screens, including record details, before API calls', async ({ page }) => {
  const api = await setup(page, 'manager', 'essential');
  for (const key of ['reservations', 'common-areas', 'polls', 'finance', 'categories']) {
    for (const suffix of ['', '/1']) {
      await page.goto(`/dashboard/${key}${suffix}`);
      await expect(page).toHaveURL('/dashboard/manager');
    }
  }
  expect(api.requests.some((request) => optionalPath.test(request.path))).toBe(false);
});

test('active session sees upgrade and downgrade on focus without logging in again', async ({ page }) => {
  const api = await setup(page, 'manager', 'essential');
  await page.goto('/dashboard/manager');
  await expect(page.getByText('Condomínio LPS · Produto Essencial', { exact: true })).toBeVisible();
  api.changePlan('complete');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('Condomínio LPS · Produto Completo', { exact: true })).toBeVisible();
  await page.goto('/dashboard/finance');
  await expect(page.getByRole('heading', { name: 'Finanças', exact: true })).toBeVisible();
  api.changePlan('essential');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page).toHaveURL('/dashboard/manager');
  await expect(page.locator('a[href="/dashboard/finance"]')).toHaveCount(0);
});

test('admin persists product choice during creation and confirms later changes', async ({ page }) => {
  const api = await setup(page, 'manager', 'complete', true);
  await page.goto('/dashboard/admin');
  await page.getByLabel('Nome do condomínio', { exact: true }).fill('Condomínio LPS');
  await page.getByLabel('Produto LPS', { exact: true }).selectOption('essential');
  await page.getByRole('button', { name: 'Criar condomínio e gerar código', exact: true }).click();
  await expect(page.getByText('Produto: Essencial', { exact: true })).toBeVisible();
  expect(api.requests.find((request) => request.method === 'POST')?.body)
    .toEqual({ name: 'Condomínio LPS', productPlan: 'essential' });
  await page.reload();
  await expect(page.getByText('Produto: Essencial', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Alterar produto de Condomínio LPS', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Os dados são preservados');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(api.requests.filter((request) => request.method === 'PATCH')).toHaveLength(0);
  await page.getByRole('button', { name: 'Alterar produto de Condomínio LPS', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar alteração', exact: true }).click();
  await expect(page.getByText('Produto: Completo', { exact: true })).toBeVisible();
  expect(api.requests.find((request) => request.method === 'PATCH')?.body).toEqual({ productPlan: 'complete' });
});
