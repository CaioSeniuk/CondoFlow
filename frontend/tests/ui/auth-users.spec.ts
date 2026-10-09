import { test, expect, type Page } from '@playwright/test';
import type { AuthenticatedUser, UserRole } from '../../lib/types';

function account(role: UserRole, id = '1'): AuthenticatedUser {
  return {
    id, condominiumId: '1', username: role, firstName: 'Lucas', lastName: 'Almeida',
    email: `${role}@example.com`, role, block: 'A', apartment: '302',
    phone: '(41) 99999-0000', isActive: true,
  };
}

async function mockApi(page: Page, role: UserRole = 'manager') {
  let me = account(role);
  let users = [me, ...Array.from({ length: 20 }, (_, index) => ({
    ...account('resident', String(index + 2)),
    username: `morador${index + 2}`, firstName: `Morador ${index + 2}`,
  }))];
  const mutations: { method: string; body: Record<string, unknown> | null }[] = [];
  let condominium = { id: '1', name: 'Condomínio Teste', codeEnabled: false, codeUpdatedAt: null as string | null };
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const send = (body: unknown, status = 200) => route.fulfill({ status, headers, json: body });
    if (method === 'OPTIONS') return send({});
    if (path === '/condominiums/me') return send(condominium);
    if (path === '/condominiums/me/registration-code') {
      condominium = { ...condominium, codeEnabled: method === 'POST', codeUpdatedAt: new Date().toISOString() };
      return send(method === 'POST' ? { ...condominium, code: 'A'.repeat(32) } : condominium);
    }
    if (path === '/token') {
      if (request.postDataJSON().password === 'wrong') return send({ message: 'Unauthorized' }, 401);
      return send({ access: 'test-access', refresh: 'test-refresh' });
    }
    if (path === '/token/refresh') return send({ access: 'renewed-access', refresh: 'renewed-refresh' });
    if (path === '/users/me') return send(me);
    if (method === 'GET' && path === '/users') {
      const current = Number(url.searchParams.get('page') || 1);
      return send({
        count: users.length, next: current * 20 < users.length ? current + 1 : null,
        previous: current > 1 ? current - 1 : null,
        results: users.slice((current - 1) * 20, current * 20),
      });
    }
    const id = path.split('/')[2];
    if (method === 'GET') {
      const user = users.find((item) => item.id === id);
      return send(user ?? { message: 'Not found' }, user ? 200 : 404);
    }
    const body = request.postData() ? request.postDataJSON() : null;
    mutations.push({ method, body });
    if (method === 'POST') {
      const { password, ...input } = body;
      const created = { ...input, id: '9007199254740993', isActive: true };
      users = [created, ...users];
      return send(created, 201);
    }
    if (method === 'PATCH') {
      users = users.map((item) => item.id === id ? { ...item, ...body } : item);
      if (me.id === id) me = { ...me, ...body };
      return send(users.find((item) => item.id === id));
    }
    if (method === 'DELETE') {
      users = users.filter((item) => item.id !== id);
      return send({});
    }
    return send({ message: 'Unknown route' }, 404);
  });
  return mutations;
}

async function authenticate(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('condoflow_access_token', 'test-access');
    localStorage.setItem('condoflow_refresh_token', 'test-refresh');
  });
}

for (const [role, label] of [
  ['resident', 'Morador'], ['manager', 'Síndico'], ['doorman', 'Porteiro'], ['provider', 'Prestador'],
] as const) {
  test(`login, profile and logout for ${role}`, async ({ page }) => {
    await mockApi(page, role);
    await page.goto('/login');
    await page.getByLabel('Usuário', { exact: true }).fill(role);
    await page.getByLabel('Senha', { exact: true }).fill('password123');
    await page.getByRole('radio', { name: label, exact: true }).check();
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(`/dashboard/${role}`);
    await page.getByRole('link', { name: 'Perfil', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Perfil', exact: true })).toBeVisible();
    await expect(page.getByText('Lucas Almeida', { exact: true })).toBeVisible();
    await expect(page.getByText(`${role}@example.com`, { exact: true })).toBeVisible();
    await expect(page.locator('input')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (role === 'manager') await page.screenshot({ path: test.info().outputPath('profile-mobile.png') });
    await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
    await expect(page).toHaveURL('/login');
    expect(await page.evaluate(() => localStorage.getItem('condoflow_access_token'))).toBeNull();
  });
}

test('landing follows the reference and login surfaces invalid credentials and wrong role', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'CondoFlow' })).toBeVisible();
  await page.getByRole('link', { name: 'Começar', exact: true }).click();
  await expect(page).toHaveURL('/register');
  await page.getByRole('link', { name: 'Voltar para entrar', exact: false }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#login-error')).toContainText('Preencha usuário e senha');
  await page.getByLabel('Usuário', { exact: true }).fill('manager');
  await page.getByLabel('Senha', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#login-error')).toContainText('Usuário ou senha inválidos');
  await page.getByLabel('Senha', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#login-error')).toContainText('Esta conta não é de Morador');
  await page.screenshot({ path: test.info().outputPath('login-mobile.png') });
  expect(await page.evaluate(() => localStorage.getItem('condoflow_access_token'))).toBeNull();
});

test('dashboard requires authentication', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/v1/**', async (route) => { requests++; await route.abort(); });
  await page.goto('/dashboard/users');
  await expect(page).toHaveURL('/login');
  expect(requests).toBe(0);
});

test('resident cannot enter manager routes or request the user list', async ({ page }) => {
  await mockApi(page, 'resident');
  await authenticate(page);
  let listRequests = 0;
  page.on('request', (request) => { if (request.url().includes('/users?page=')) listRequests++; });
  await page.goto('/dashboard/users');
  await expect(page).toHaveURL('/dashboard/resident');
  await expect(page.getByRole('link', { name: 'Usuários', exact: true })).toHaveCount(0);
  expect(listRequests).toBe(0);
  await page.goto('/dashboard/manager');
  await expect(page).toHaveURL('/dashboard/resident');
});

test('manager can paginate, create, inspect, edit and confirm deletion', async ({ page }) => {
  const mutations = await mockApi(page);
  await authenticate(page);
  await page.goto('/dashboard/users');
  await expect(page.getByText('21 usuário(s) cadastrado(s)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByText('Página 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(page.getByText('Página 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '+ Novo usuário', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Usuário *', { exact: true }).fill('ana');
  await dialog.getByLabel('Senha * (mínimo de 8 caracteres)', { exact: true }).fill('123');
  await dialog.getByLabel('E-mail *', { exact: true }).fill('ana@example.com');
  await dialog.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
  expect(mutations).toHaveLength(0);
  await dialog.getByLabel('Senha * (mínimo de 8 caracteres)', { exact: true }).fill('password123');
  await dialog.getByLabel('Nome', { exact: true }).fill('Ana');
  await dialog.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Usuário cadastrado.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver dados de ana', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver dados de ana', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('ana@example.com', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Editar ana', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.locator('input[type="password"]')).toHaveCount(0);
  await dialog.getByLabel('Nome', { exact: true }).fill('Ana Maria');
  await dialog.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ana Maria', exact: true })).toBeVisible();
  expect(mutations.find((item) => item.method === 'PATCH')?.body).not.toHaveProperty('password');
  await page.getByRole('button', { name: 'Excluir ana', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(mutations.filter((item) => item.method === 'DELETE')).toHaveLength(0);
  await page.getByRole('button', { name: 'Excluir ana', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir usuário', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ana Maria', exact: true })).toHaveCount(0);
  expect(mutations.filter((item) => item.method === 'DELETE')).toHaveLength(1);
});

test('mobile and desktop user forms have no horizontal overflow', async ({ page }) => {
  await mockApi(page);
  await authenticate(page);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/dashboard/users');
    await page.getByRole('button', { name: '+ Novo usuário', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.getByRole('dialog').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.keyboard.press('Escape');
  }
});

test('API failures remain visible and retry restores the user list', async ({ page }) => {
  await mockApi(page);
  await authenticate(page);
  await page.route('**/api/v1/users?page=*', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fallback();
    return route.fulfill({ status: 500, headers: { 'Access-Control-Allow-Origin': '*' }, json: { message: 'Falha ao listar usuários' } });
  });
  await page.goto('/dashboard/users');
  await expect(page.locator('main [role="alert"]')).toContainText('Falha ao listar usuários');
  await page.unroute('**/api/v1/users?page=*');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText('21 usuário(s) cadastrado(s)', { exact: true })).toBeVisible();
});

test('editing own role revalidates the session and removes manager access', async ({ page }) => {
  await mockApi(page);
  await authenticate(page);
  await page.goto('/dashboard/users');
  await page.getByRole('button', { name: 'Editar manager', exact: true }).click();
  await page.getByRole('dialog').getByRole('combobox', { name: 'Perfil *', exact: true }).selectOption('resident');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar usuário', exact: true }).click();
  await expect(page).toHaveURL('/dashboard/resident');
  await expect(page.getByRole('link', { name: 'Usuários', exact: true })).toHaveCount(0);
});

test('expired session redirects to login without rendering protected content', async ({ page }) => {
  await mockApi(page);
  await authenticate(page);
  await page.route('**/api/v1/users/me', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fallback();
    return route.fulfill({ status: 401, headers: { 'Access-Control-Allow-Origin': '*' }, json: {} });
  });
  await page.route('**/api/v1/token/refresh', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fallback();
    return route.fulfill({ status: 401, headers: { 'Access-Control-Allow-Origin': '*' }, json: {} });
  });
  await page.goto('/dashboard/users');
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: 'Usuários', exact: true })).toHaveCount(0);
});

test('failed creation stays open with an explicit error', async ({ page }) => {
  await mockApi(page);
  await authenticate(page);
  await page.route('**/api/v1/users/managed', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({ status: 400, headers: { 'Access-Control-Allow-Origin': '*' }, json: { message: 'Usuário já cadastrado' } });
  });
  await page.goto('/dashboard/users');
  await page.getByRole('button', { name: '+ Novo usuário', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Usuário *', { exact: true }).fill('duplicado');
  await dialog.getByLabel('Senha * (mínimo de 8 caracteres)', { exact: true }).fill('password123');
  await dialog.getByLabel('E-mail *', { exact: true }).fill('duplicado@example.com');
  await dialog.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Usuário já cadastrado');
  await expect(dialog.getByLabel('Usuário *', { exact: true })).toHaveValue('duplicado');
});

test('loading and empty list are explicit', async ({ page }) => {
  await mockApi(page);
  await authenticate(page);
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/users?page=*', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fallback();
    await pending;
    return route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: { count: 0, next: null, previous: null, results: [] },
    });
  });
  await page.goto('/dashboard/users');
  await expect(page.getByText('Carregando usuários...', { exact: true })).toBeVisible();
  release();
  await expect(page.getByText('Nenhum usuário cadastrado.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Anterior', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled();
});

test('deleting the last user on page two returns to page one', async ({ page }) => {
  await mockApi(page);
  await authenticate(page);
  await page.goto('/dashboard/users');
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByText('Página 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Excluir morador21', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir usuário', exact: true }).click();
  await expect(page.getByText('Página 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(20);
});

for (const role of ['resident', 'doorman', 'provider'] as const) {
  test(`public registration supports ${role} without an authenticated session`, async ({ page }) => {
    const mutations = await mockApi(page);
    let authorization: string | undefined;
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/users') {
        authorization = request.headers().authorization;
      }
    });
    await page.goto('/login');
    await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
    await expect(page.getByRole('option', { name: 'Síndico', exact: true })).toHaveCount(0);
    await page.getByLabel('Código do condomínio *', { exact: true }).fill('A'.repeat(32));
    await page.getByLabel('Usuário *', { exact: true }).fill(`novo-${role}`);
    await page.getByLabel('Senha * (mínimo de 8 caracteres)', { exact: true }).fill('password123');
    await page.getByLabel('Confirmar senha *', { exact: true }).fill('password123');
    await page.getByLabel('E-mail *', { exact: true }).fill(`${role}@example.com`);
    await page.getByRole('combobox', { name: 'Perfil *', exact: true }).selectOption(role);
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Conta criada com sucesso!');
    expect(mutations).toHaveLength(1);
    expect(mutations[0].body?.role).toBe(role);
    expect(mutations[0].body).not.toHaveProperty('confirmation');
    expect(authorization).toBeUndefined();
    expect(await page.evaluate(() => localStorage.getItem('condoflow_access_token'))).toBeNull();
    await page.getByRole('link', { name: 'Entrar na minha conta', exact: true }).click();
    await expect(page).toHaveURL('/login');
  });
}

test('registration validates passwords and preserves input on API failures', async ({ page }) => {
  const mutations = await mockApi(page);
  await page.route('**/api/v1/users', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({ status: 409, headers: { 'Access-Control-Allow-Origin': '*' }, json: { message: 'Usuário já cadastrado' } });
  });
  await page.goto('/register');
  await page.getByLabel('Código do condomínio *', { exact: true }).fill('A'.repeat(32));
  await page.getByLabel('Usuário *', { exact: true }).fill('ana');
  await page.getByLabel('E-mail *', { exact: true }).fill('ana@example.com');
  await page.getByLabel('Senha * (mínimo de 8 caracteres)', { exact: true }).fill('123');
  await page.getByLabel('Confirmar senha *', { exact: true }).fill('123');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  expect(mutations).toHaveLength(0);
  await page.getByLabel('Senha * (mínimo de 8 caracteres)', { exact: true }).fill('password123');
  await page.getByLabel('Confirmar senha *', { exact: true }).fill('different123');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('#register-error')).toHaveText('As senhas não coincidem.');
  expect(mutations).toHaveLength(0);
  await page.getByLabel('Confirmar senha *', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('#register-error')).toHaveText('Usuário já cadastrado');
  await expect(page.getByLabel('Usuário *', { exact: true })).toHaveValue('ana');
  await expect(page.getByRole('status')).toHaveCount(0);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('manager generates and revokes a condominium code', async ({ page }) => {
  await mockApi(page);
  await authenticate(page);
  await page.goto('/dashboard/users');
  const panel = page.getByRole('region', { name: 'Código de cadastro do condomínio', exact: true });
  await expect(panel.getByText('Condomínio Teste · Cadastros públicos bloqueados')).toBeVisible();
  await panel.getByRole('button', { name: 'Gerar novo código', exact: true }).click();
  await page.getByRole('dialog', { name: 'Gerar novo código', exact: true }).getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(panel.getByLabel('Código gerado', { exact: true })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Gerar novo código', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Gerar novo código', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar geração', exact: true }).click();
  await expect(panel.getByLabel('Código gerado', { exact: true })).toHaveValue('A'.repeat(32));
  await panel.getByRole('button', { name: 'Revogar código', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar revogação', exact: true }).click();
  await expect(panel.getByText('Código revogado. Novos cadastros estão bloqueados.')).toBeVisible();
  await expect(panel.getByLabel('Código gerado', { exact: true })).toHaveCount(0);
});

test('global admin creates only a condominium with a persistent code', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/v1/users/me', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fallback();
    return route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json: {
      ...account('manager'), isSuperuser: true, username: 'admin',
    } });
  });
  let created = false;
  let currentCode = 'A'.repeat(32);
  let deleteBlocked = true;
  let deleteRequests = 0;
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  await page.route('**/api/v1/admin/condominiums**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ headers, json: {} });
    if (request.method() === 'GET') return route.fulfill({ headers, json: {
      count: created ? 1 : 0, next: null, previous: null,
      results: created ? [{ id: '2', name: 'Condomínio Novo', registrationCode: currentCode, codeUpdatedAt: new Date().toISOString() }] : [],
    } });
    if (request.url().includes('registration-code')) {
      currentCode = 'B'.repeat(32);
      return route.fulfill({ headers, json: { id: '2', name: 'Condomínio Novo', code: currentCode } });
    }
    if (request.method() === 'DELETE') {
      deleteRequests++;
      if (deleteBlocked) return route.fulfill({ status: 409, headers, json: {
        message: 'Não é possível excluir um condomínio com usuários ou outros registros vinculados.',
      } });
      created = false;
      return route.fulfill({ headers, json: { message: 'Condomínio excluído.' } });
    }
    expect(request.postDataJSON()).toEqual({ name: 'Condomínio Novo' });
    if (created) return route.fulfill({ status: 409, headers, json: { message: 'Já existe um condomínio com este nome.' } });
    created = true;
    return route.fulfill({ status: 201, headers, json: { id: '2', name: 'Condomínio Novo', code: 'A'.repeat(32) } });
  });
  await page.goto('/login');
  await page.getByLabel('Usuário', { exact: true }).fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('admin-password123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL('/dashboard/admin');
  await page.getByLabel('Nome do condomínio', { exact: true }).fill('Condomínio Novo');
  await expect(page.getByLabel('Nome do síndico', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Criar condomínio e gerar código', exact: true }).click();
  await expect(page.getByLabel('Código gerado', { exact: true })).toHaveValue('A'.repeat(32));
  await expect(page.getByText('Condomínio criado e código gerado. O código é reutilizável e não expira.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Código de cadastro de Condomínio Novo', { exact: true })).toHaveValue('A'.repeat(32));
  await expect(page.getByText('Códigos gerados não expiram. Gerar outro substitui o anterior.', { exact: true })).toBeVisible();
  await page.getByLabel('Nome do condomínio', { exact: true }).fill('Condomínio Novo');
  await page.getByRole('button', { name: 'Criar condomínio e gerar código', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Já existe um condomínio com este nome.' })).toBeVisible();
  await page.getByRole('button', { name: 'Gerar código para Condomínio Novo', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar geração', exact: true }).click();
  await expect(page.getByLabel('Código gerado', { exact: true })).toHaveValue('B'.repeat(32));
  await page.reload();
  await expect(page.getByLabel('Código de cadastro de Condomínio Novo', { exact: true })).toHaveValue('B'.repeat(32));
  await page.getByRole('button', { name: 'Excluir condomínio Condomínio Novo', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Esta ação não pode ser desfeita.');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(deleteRequests).toBe(0);
  await expect(page.getByLabel('Código de cadastro de Condomínio Novo', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Excluir condomínio Condomínio Novo', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Não é possível excluir um condomínio' })).toBeVisible();
  await expect(page.getByLabel('Código de cadastro de Condomínio Novo', { exact: true })).toBeVisible();
  deleteBlocked = false;
  await page.getByRole('button', { name: 'Excluir condomínio Condomínio Novo', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Condomínio Condomínio Novo excluído.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Excluir condomínio Condomínio Novo', exact: true })).toHaveCount(0);
});

test('ordinary manager cannot render the global administrator area', async ({ page }) => {
  await mockApi(page);
  await authenticate(page);
  let adminRequests = 0;
  page.on('request', (request) => { if (request.url().includes('/api/v1/admin/')) adminRequests++; });
  await page.goto('/dashboard/admin');
  await expect(page).toHaveURL('/dashboard/manager');
  expect(adminRequests).toBe(0);
});
