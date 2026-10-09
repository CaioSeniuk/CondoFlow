import { test, expect, type Page } from '@playwright/test';
import { createLabels, modules, type DomainRecord, type ModuleDefinition } from '../../lib/modules';
import type { UserRole } from '../../lib/types';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };

function fixture(module: ModuleDefinition): DomainRecord {
  return {
    id: '1', name: 'Registro Teste', title: 'Aviso Teste', message: 'Mensagem do condomínio',
    question: 'Qual melhoria?', description: 'Descrição Teste', notes: 'Serviço realizado',
    category: module.key === 'finance' ? { name: 'Manutenção' } : 'Elétrica',
    categoryId: '1', location: 'Garagem', urgency: 'medium', status: module.key === 'packages' ? 'pending' : module.key === 'reservations' ? 'confirmed' : 'open',
    block: 'A', apartment: '101', document: '', contact: '41999999999',
    contractNumber: 'CT-1', userId: '1', ticketId: '1', providerId: '1',
    commonAreaId: '1', commonArea: { name: 'Salão' }, resident: { firstName: 'Ana', lastName: 'Silva' },
    createdAt: '2027-01-01T10:00:00Z', updatedAt: '2027-01-01T10:00:00Z',
    startTime: '2027-01-01T10:00:00Z', endTime: '2027-01-01T12:00:00Z',
    validFrom: '2027-01-01T10:00:00Z', validUntil: '2027-01-01T12:00:00Z',
    isValid: true, token: 'd8b9165f-c8b2-4cfe-8648-3f9083d6bb5f',
    options: [{ id: '1', text: 'Piscina', totalVotes: 2 }, { id: '2', text: 'Jardim', totalVotes: 1 }],
    votedByMe: false, closesAt: null, confirmedByMe: false, segment: 'all', urgent: false,
    referenceMonth: '2027-01-01', budgetedAmount: '100.00', actualAmount: '90.00',
    visitorId: '1', registeredById: '1', registeredAt: '2027-01-01T10:00:00Z', direction: 'entry',
    statusHistory: [{ id: '1', status: 'open', note: 'Aberto', changedAt: '2027-01-01T10:00:00Z' }],
  };
}

async function setup(page: Page, role: UserRole, target: ModuleDefinition) {
  const mutations: { path: string; method: string; body: unknown; contentType: string }[] = [];
  let records = [fixture(target)];
  let reads = 0;
  let fail = false;
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
    if (path === '/users/me') return send({
      id: '1', condominiumId: '1', username: role, firstName: 'Ana', lastName: 'Silva',
      email: 'ana@example.com', role, block: 'A', apartment: '101', phone: '', isActive: true,
    });
    if (method === 'GET') {
      if (path === `${target.path}/1`) return send(records[0] ?? { message: 'Não encontrado.' }, records.length ? 200 : 404);
      if (path === target.path) {
        reads++;
        if (fail) return send({ message: 'Erro ao carregar registros.' }, 503);
        return send({ count: records.length, previous: null, next: null, results: records });
      }
      if (path === '/users') return send({ count: 1, previous: null, next: null,
        results: [{ id: '1', username: 'prestador', role: 'provider' }] });
      const module = modules.find((item) => item.path === path);
      if (module) return send({ count: 1, previous: null, next: null, results: [fixture(module)] });
      return send({ message: 'Rota não encontrada.' }, 404);
    }
    const contentType = request.headers()['content-type'] ?? '';
    mutations.push({ path, method, body: contentType.includes('json') ? request.postDataJSON() : request.postData(), contentType });
    if (fail) return send({ message: 'Operação recusada.' }, 400);
    if (path.includes('/reports/')) return send({ title: 'Relatório Teste', generatedAt: '2027-01-01T10:00:00Z', lines: ['Manutenção: R$ 90,00'] });
    if (method === 'DELETE') records = [];
    if (path.endsWith('/vote')) records = records.map((record) => ({ ...record, votedByMe: true }));
    if (path.endsWith('/confirm_read')) records = records.map((record) => ({ ...record, confirmedByMe: true }));
    return send(fixture(target), method === 'POST' ? 201 : 200);
  });
  return {
    mutations, reads: () => reads,
    change: (values: Partial<DomainRecord>) => { records = records.map((record) => ({ ...record, ...values })); },
    fail: (value: boolean) => { fail = value; },
  };
}

for (const module of modules.filter((item) => item.path)) {
  test(`${module.key}: renders real fields, empty state and retry`, async ({ page }) => {
    const role = module.roles[0];
    const api = await setup(page, role, module);
    await page.goto(`/dashboard/${module.key}`);
    await expect(page.getByRole('heading', { name: module.title, exact: true })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByLabel('Buscar nesta página', { exact: true }).fill('sem correspondência');
    await expect(page.getByText('Nenhum registro encontrado.', { exact: true })).toBeVisible();
    await page.getByLabel('Buscar nesta página', { exact: true }).fill('');
    api.fail(true);
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Erro ao carregar registros.' })).toBeVisible();
    api.fail(false);
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Erro ao carregar registros.' })).toHaveCount(0);
  });
}

for (const module of modules.filter((item) => item.createRoles.length)) {
  test(`${module.key}: creates via correct contract and edits without create-only fields`, async ({ page }) => {
    const api = await setup(page, module.createRoles[0], module);
    await page.goto(`/dashboard/${module.key}`);
    await page.getByRole('button', { name: `+ ${createLabels[module.key]}`, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Salvar', exact: true })).toBeEnabled();
    for (const field of module.fields) {
      const input = dialog.locator(`[name="${field.key}"]`);
      if (field.type === 'file') await input.setInputFiles({
        name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('image-test'),
      });
      else if (field.type === 'select') await input.selectOption(field.options?.[0]?.value ?? '1');
      else if (field.type === 'checkbox') await input.check();
      else if (field.type === 'options') await input.fill('Sim\nNão');
      else if (field.type === 'datetime-local') await input.fill(
        /Until|endTime/.test(field.key) ? '2027-01-02T12:00' : '2027-01-01T10:00');
      else if (field.type === 'date') await input.fill('2027-01-01');
      else if (field.type === 'number') await input.fill('99.50');
      else if (!(module.createRoles[0] === 'resident' && ['block', 'apartment'].includes(field.key))) {
        await input.fill(field.key === 'name' ? 'Novo nome' : 'Texto');
      }
    }
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Registro cadastrado.' })).toBeVisible();
    expect(api.mutations[0].path).toBe(module.path);
    expect(api.mutations[0].method).toBe('POST');
    if (module.multipart) {
      expect(api.mutations[0].contentType).toContain('multipart/form-data; boundary=');
      expect(String(api.mutations[0].body)).toContain(`name="${module.fields[0].key}"`);
    } else {
      expect(api.mutations[0].contentType).toContain('application/json');
      if (module.key === 'polls') expect(api.mutations[0].body).toMatchObject({ options: [{ text: 'Sim' }, { text: 'Não' }] });
      if (module.key === 'reservations') expect(api.mutations[0].body).toMatchObject({ commonArea: 1 });
      if (module.key === 'visitors') expect(api.mutations[0].body).toMatchObject({ block: 'A', apartment: '101' });
    }
    await page.getByRole('button', { name: 'Editar registro #1', exact: true }).click();
    for (const field of module.fields.filter((item) => item.createOnly)) {
      await expect(page.getByRole('dialog').locator(`[name="${field.key}"]`)).toHaveCount(0);
    }
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Registro atualizado.' })).toBeVisible();
    expect(api.mutations[1].method).toBe('PATCH');
    expect(api.mutations[1].path).toBe(`${module.path}/1`);
    await page.getByRole('button', { name: 'Excluir registro #1', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(api.mutations).toHaveLength(2);
    await page.getByRole('button', { name: 'Excluir registro #1', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
    await expect(page.getByRole('article')).toHaveCount(0);
    expect(api.mutations[2].method).toBe('DELETE');
  });
}

test('resident confirms reading, votes once and sees QR code', async ({ page }) => {
  let api = await setup(page, 'resident', modules.find((item) => item.key === 'announcements')!);
  await page.goto('/dashboard/announcements');
  await expect(page.getByRole('button', { name: '+ Novo comunicado' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Confirmar leitura', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Leitura confirmada', exact: true })).toBeDisabled();
  expect(api.mutations[0].path).toBe('/announcements/1/confirm_read');
  await page.unroute('**/api/v1/**');
  api = await setup(page, 'resident', modules.find((item) => item.key === 'polls')!);
  await page.goto('/dashboard/polls');
  await page.getByRole('button', { name: 'Votar em Piscina', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Votar em Piscina', exact: true })).toBeDisabled();
  expect(api.mutations[0].body).toEqual({ option: 1 });
  await page.unroute('**/api/v1/**');
  await setup(page, 'resident', modules.find((item) => item.key === 'visitors')!);
  await page.goto('/dashboard/visitors');
  await page.getByText('QR Code e token de acesso', { exact: true }).click();
  await expect(page.getByRole('img', { name: 'QR Code de acesso do visitante' })).toBeVisible();
  await expect(page.getByLabel('Token de acesso')).toHaveValue('d8b9165f-c8b2-4cfe-8648-3f9083d6bb5f');
});

test('doorman registers pickup and validates entry/exit with actual enum', async ({ page }) => {
  let api = await setup(page, 'doorman', modules.find((item) => item.key === 'packages')!);
  await page.goto('/dashboard/packages');
  await page.getByRole('button', { name: 'Registrar retirada', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Retirado por *', { exact: true }).fill('Maria');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(api.mutations[0].body).toEqual({ pickedUpBy: 'Maria' });
  await page.unroute('**/api/v1/**');
  api = await setup(page, 'doorman', modules.find((item) => item.key === 'access-logs')!);
  await page.goto('/dashboard/access-logs');
  await page.getByRole('button', { name: 'Validar token', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Token do visitante *', { exact: true }).fill('d8b9165f-c8b2-4cfe-8648-3f9083d6bb5f');
  await page.getByRole('dialog').getByLabel('Movimento *', { exact: true }).selectOption('exit');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(api.mutations[0].path).toBe('/visitors/validate_token');
  expect(api.mutations[0].body).toMatchObject({ direction: 'exit' });
});

test('manager assigns a provider and provider advances assigned tickets', async ({ page }) => {
  let api = await setup(page, 'manager', modules.find((item) => item.key === 'tickets')!);
  await page.goto('/dashboard/tickets');
  await page.getByRole('button', { name: 'Atribuir prestador', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Prestador *', { exact: true }).selectOption('1');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(api.mutations[0].body).toEqual({ provider: 1 });
  await page.unroute('**/api/v1/**');
  api = await setup(page, 'provider', modules.find((item) => item.key === 'tickets')!);
  await page.goto('/dashboard/tickets');
  await expect(page.getByRole('button', { name: 'Atribuir prestador', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Editar registro #1', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Alterar status', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Novo status *', { exact: true }).selectOption('in_progress');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(api.mutations[0].path).toBe('/tickets/1/actions');
});

test('finance reports omit blank optional category and display formatted lines', async ({ page }) => {
  const api = await setup(page, 'manager', modules.find((item) => item.key === 'finance')!);
  await page.goto('/dashboard/finance');
  await page.getByRole('button', { name: 'Relatório orçado x realizado', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Data inicial *', { exact: true }).fill('2027-01-01');
  await page.getByRole('dialog').getByLabel('Data final *', { exact: true }).fill('2027-12-31');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Relatório financeiro' })).toContainText('Manutenção: R$ 90,00');
  expect(api.mutations[0].body).not.toHaveProperty('category');
});

test('polling refreshes data without wiping an open form and focus refresh works', async ({ page }) => {
  await page.clock.install();
  const api = await setup(page, 'manager', modules.find((item) => item.key === 'announcements')!);
  await page.goto('/dashboard/announcements');
  await expect(page.getByRole('article')).toContainText('Aviso Teste');
  const reads = api.reads();
  api.change({ title: 'Aviso atualizado' });
  await page.clock.fastForward(15000);
  await expect(page.getByRole('article')).toContainText('Aviso atualizado');
  expect(api.reads()).toBeGreaterThan(reads);
  await page.getByRole('button', { name: '+ Novo comunicado', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Título *', { exact: true }).fill('Rascunho');
  const before = api.reads();
  await page.clock.fastForward(30000);
  expect(api.reads()).toBe(before);
  await expect(page.getByRole('dialog').getByLabel('Título *', { exact: true })).toHaveValue('Rascunho');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  api.change({ title: 'Atualizado em outra sessão' });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('article')).toContainText('Atualizado em outra sessão');
  const visibleReads = api.reads();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(30000);
  expect(api.reads()).toBe(visibleReads);
  api.change({ title: 'Atualizado ao retornar à aba' });
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('article')).toContainText('Atualizado ao retornar à aba');
});

test('restricted routes redirect before calling domain API', async ({ page }) => {
  const api = await setup(page, 'doorman', modules.find((item) => item.key === 'finance')!);
  await page.goto('/dashboard/finance');
  await expect(page).toHaveURL('/dashboard/doorman');
  expect(api.reads()).toBe(0);
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Finanças', exact: true })).toHaveCount(0);
});

test('invalid dates and failed mutations keep the form and error visible', async ({ page }) => {
  const api = await setup(page, 'resident', modules.find((item) => item.key === 'reservations')!);
  await page.goto('/dashboard/reservations');
  await page.getByRole('button', { name: '+ Nova reserva', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Área comum *', { exact: true }).selectOption('1');
  await dialog.getByLabel('Início *', { exact: true }).fill('2027-01-02T12:00');
  await dialog.getByLabel('Fim *', { exact: true }).fill('2027-01-01T10:00');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('O fim do período deve ser posterior ao início.');
  expect(api.mutations).toHaveLength(0);
  await dialog.getByLabel('Fim *', { exact: true }).fill('2027-01-03T10:00');
  api.fail(true);
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Operação recusada.');
  await expect(dialog.getByLabel('Área comum *', { exact: true })).toHaveValue('1');
});

for (const role of ['resident', 'manager', 'doorman', 'provider'] as const) {
  test(`${role} home follows the design with actual summaries and responsive navigation`, async ({ page }) => {
    await setup(page, role, modules.find((item) => item.key === 'tickets')!);
    await page.goto(`/dashboard/${role}`);
    await expect(page.getByRole('heading', { name: 'Ações rápidas', exact: true })).toBeVisible();
    await expect(page.getByText('Carregando resumo...', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Navegação rápida' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Resumo do condomínio' })).toContainText('1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`${role}-mobile.png`), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('notifications and history use scoped records, and read state survives reload', async ({ page }) => {
  await setup(page, 'resident', modules.find((item) => item.key === 'announcements')!);
  await page.goto('/dashboard/notifications');
  await expect(page.getByRole('heading', { name: 'Notificações', exact: true })).toBeVisible();
  const card = page.getByRole('article').filter({ hasText: 'Aviso Teste' });
  await card.getByRole('button', { name: 'Marcar como lida', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Lida', exact: true })).toBeDisabled();
  await page.reload();
  await expect(card.getByRole('button', { name: 'Lida', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Não lidas', exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.goto('/dashboard/history');
  await expect(page.getByRole('heading', { name: 'Histórico geral', exact: true })).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: 'Aviso Teste' })).toHaveCount(1);
});

test('individual ticket details preserve scoped route, history and provider actions', async ({ page }) => {
  const api = await setup(page, 'provider', modules.find((item) => item.key === 'tickets')!);
  await page.goto('/dashboard/tickets');
  await page.getByRole('link', { name: 'Ver detalhes #1', exact: true }).click();
  await expect(page).toHaveURL('/dashboard/tickets/1');
  await expect(page.getByRole('article')).toContainText('Elétrica');
  await page.getByText('Histórico de status', { exact: true }).click();
  await expect(page.getByRole('article')).toContainText('Aberto');
  await page.getByRole('button', { name: 'Alterar status', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Novo status *', { exact: true }).selectOption('resolved');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(api.mutations[0].body).toMatchObject({ status: 'resolved' });
});

test('deleting the last reservation on the second page returns to the first page', async ({ page }) => {
  const module = modules.find((item) => item.key === 'reservations')!;
  await setup(page, 'resident', module);
  let deleted = false;
  await page.route(/\/api\/v1\/reservations\?page=\d+$/, async (route) => {
    const current = Number(new URL(route.request().url()).searchParams.get('page'));
    return route.fulfill({ headers, json: {
      count: deleted ? 20 : 21, next: current === 1 && !deleted ? 2 : null,
      previous: current === 2 ? 1 : null,
      results: current === 1 ? Array.from({ length: 20 }, (_, i) => ({ ...fixture(module), id: String(i + 1) }))
        : deleted ? [] : [{ ...fixture(module), id: '21' }],
    } });
  });
  await page.route('**/api/v1/reservations/21', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ headers, json: {} });
    deleted = true;
    return route.fulfill({ headers, json: {} });
  });
  await page.goto('/dashboard/reservations');
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByText('Página 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Excluir registro #21', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
  await expect(page.getByText('Página 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(20);
});
