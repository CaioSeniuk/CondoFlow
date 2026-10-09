const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

let api;
let auth;
let store;
let domain;

beforeEach(() => {
  store = new Map();
  const cache = new Map();
  const context = vm.createContext({
    process, Headers, Event, FormData,
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
    window: { dispatchEvent() {} },
    fetch: (...args) => global.fetch(...args),
  });
  function load(name) {
    if (cache.has(name)) return cache.get(name).exports;
    const source = fs.readFileSync(path.join(__dirname, '../lib', `${name}.ts`), 'utf8');
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const module = { exports: {} };
    cache.set(name, module);
    vm.runInContext(`(function(require, module, exports) {${code}\n})`, context)(
      (specifier) => load(specifier.replace('./', '')), module, module.exports,
    );
    return module.exports;
  }
  auth = load('auth');
  api = load('api');
  domain = load('domain-api');
  auth.saveTokens({ access: 'old-access', refresh: 'old-refresh' });
});

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

test('each role accesses its home and profile, only manager accesses users', () => {
  for (const role of ['resident', 'manager', 'doorman', 'provider']) {
    assert.equal(auth.dashboardPathForRole(role), `/dashboard/${role}`);
    assert.equal(auth.canAccessDashboard('/dashboard/profile', role), true);
    assert.equal(auth.canAccessDashboard('/dashboard/users', role), role === 'manager');
    for (const other of ['resident', 'manager', 'doorman', 'provider']) {
      assert.equal(auth.canAccessDashboard(`/dashboard/${other}`, role), role === other);
    }
  }
  assert.equal(auth.canAccessDashboard('/dashboard/manager-other', 'manager'), false);
  assert.equal(auth.dashboardPathForRole('manager', true), '/dashboard/admin');
  assert.equal(auth.canAccessDashboard('/dashboard/admin', 'manager'), false);
  assert.equal(auth.canAccessDashboard('/dashboard/admin', 'manager', true), true);
});

test('login sends username, maps invalid credentials and does not save failed tokens', async () => {
  global.fetch = async (url, init) => {
    assert.ok(url.endsWith('/api/v1/token'));
    assert.deepEqual(JSON.parse(init.body), { username: 'lucas', password: 'invalid' });
    return json({ message: 'Unauthorized' }, 401);
  };
  await assert.rejects(api.login('lucas', 'invalid'), { status: 401, message: 'Usuário ou senha inválidos.' });
  assert.equal(auth.getAccessToken(), 'old-access');
});

test('concurrent 401 requests share one refresh and retry with the new token', async () => {
  let refreshCount = 0;
  let protectedCount = 0;
  global.fetch = async (url, init) => {
    if (url.endsWith('/token/refresh')) {
      refreshCount++;
      assert.deepEqual(JSON.parse(init.body), { refresh: 'old-refresh' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      return json({ access: 'new-access', refresh: 'new-refresh' });
    }
    protectedCount++;
    return init.headers.get('Authorization') === 'Bearer old-access'
      ? json({}, 401) : json({ id: '9007199254740993', role: 'manager' });
  };
  const results = await Promise.all([api.usersApi.me(), api.usersApi.me(), api.usersApi.me()]);
  assert.equal(refreshCount, 1);
  assert.equal(protectedCount, 6);
  assert.equal(results[0].id, '9007199254740993');
  assert.equal(auth.getAccessToken(), 'new-access');
});

test('invalid refresh clears session without an infinite retry', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; return json({ message: 'Expired' }, 401); };
  await assert.rejects(api.usersApi.me(), { status: 401 });
  assert.equal(calls, 2);
  assert.equal(auth.getAccessToken(), null);
  assert.equal(auth.getRefreshToken(), null);
});

test('401 after refresh clears session and stops', async () => {
  let calls = 0;
  global.fetch = async (url) => {
    calls++;
    return url.endsWith('/token/refresh')
      ? json({ access: 'new', refresh: 'new-refresh' }) : json({}, 401);
  };
  await assert.rejects(api.usersApi.me(), { status: 401 });
  assert.equal(calls, 3);
  assert.equal(auth.getAccessToken(), null);
});

test('network errors do not retry mutations or clear session', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; throw new TypeError('Network failure'); };
  await assert.rejects(api.usersApi.create({ username: 'lucas' }), /Network failure/);
  assert.equal(calls, 1);
  assert.equal(auth.getAccessToken(), 'old-access');
});

test('refresh network failure preserves tokens and surfaces the error', async () => {
  global.fetch = async (url) => {
    if (url.endsWith('/token/refresh')) throw new TypeError('Network failure');
    return json({}, 401);
  };
  await assert.rejects(api.usersApi.me(), /Network failure/);
  assert.equal(auth.getRefreshToken(), 'old-refresh');
});

test('logout while refresh is pending cannot restore the old session', async () => {
  let release;
  let started;
  const waiting = new Promise((resolve) => { started = resolve; });
  global.fetch = async (url) => {
    if (url.endsWith('/token/refresh')) {
      started();
      return new Promise((resolve) => { release = resolve; });
    }
    return json({}, 401);
  };
  const pending = api.usersApi.me();
  await waiting;
  auth.clearTokens();
  release(json({ access: 'new-access', refresh: 'new-refresh' }));
  await assert.rejects(pending, { status: 401 });
  assert.equal(auth.getAccessToken(), null);
});

test('forbidden and validation errors are surfaced without refreshing', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; return json({}, 403); };
  await assert.rejects(api.usersApi.list(1), { status: 403 });
  assert.equal(calls, 1);
  global.fetch = async () => json({ message: ['Campo inválido', 'E-mail obrigatório'] }, 400);
  await assert.rejects(api.usersApi.create({}), { message: 'Campo inválido, E-mail obrigatório' });
});

test('users methods preserve pagination, HTTP verbs and update payload without password', async () => {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return json(url.includes('?page=') ? { count: 21, next: null, previous: 1, results: [] } : { id: '21' });
  };
  const result = await api.usersApi.list(2);
  assert.equal(result.count, 21);
  assert.equal(result.previous, 1);
  await api.usersApi.get('21');
  await api.usersApi.create({ username: 'ana', password: 'password123' });
  await api.usersApi.update('21', { username: 'ana', role: 'resident' });
  await api.usersApi.remove('21');
  assert.ok(calls[0].url.endsWith('/users?page=2'));
  assert.equal(calls[1].init.method, undefined);
  assert.equal(calls[2].init.method, 'POST');
  assert.ok(calls[2].url.endsWith('/users/managed'));
  assert.equal(calls[3].init.method, 'PATCH');
  assert.equal(JSON.parse(calls[3].init.body).password, undefined);
  assert.equal(calls[4].init.method, 'DELETE');
});

test('missing session makes no request and 204 responses are accepted', async () => {
  auth.clearTokens();
  global.fetch = async () => { throw new Error('Should not fetch'); };
  await assert.rejects(api.usersApi.me(), { status: 401 });
  auth.saveTokens({ access: 'access', refresh: 'refresh' });
  global.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await api.usersApi.remove('1'), undefined);
});

test('public registration requires no tokens and surfaces creation errors', async () => {
  auth.clearTokens();
  global.fetch = async (url, init) => {
    assert.ok(url.endsWith('/api/v1/users'));
    assert.equal(init.method, 'POST');
    assert.equal(new Headers(init.headers).get('Authorization'), null);
    assert.equal(JSON.parse(init.body).role, 'provider');
    return json({ id: '42', role: 'provider' }, 201);
  };
  const created = await api.registerUser({ username: 'novo', role: 'provider', password: 'password123', condominiumCode: 'A'.repeat(32) });
  assert.equal(created.id, '42');
  assert.equal(auth.getAccessToken(), null);
  global.fetch = async () => json({ message: 'Usuário já cadastrado' }, 409);
  await assert.rejects(api.registerUser({}), { status: 409, message: 'Usuário já cadastrado' });
});

test('domain routes enforce profile access and do not grant tenant screens to global admins', () => {
  assert.equal(auth.canAccessDashboard('/dashboard/announcements', 'resident'), true);
  assert.equal(auth.canAccessDashboard('/dashboard/tickets', 'provider'), true);
  assert.equal(auth.canAccessDashboard('/dashboard/evidences', 'provider'), true);
  assert.equal(auth.canAccessDashboard('/dashboard/finance', 'doorman'), false);
  assert.equal(auth.canAccessDashboard('/dashboard/providers', 'resident'), false);
  assert.equal(auth.canAccessDashboard('/dashboard/finance', 'manager', true), false);
});

test('multipart requests preserve browser boundary instead of setting JSON content type', async () => {
  const form = new FormData();
  form.set('description', 'Encomenda');
  global.fetch = async (_url, init) => {
    assert.equal(init.body, form);
    assert.equal(init.headers.get('Content-Type'), null);
    return json({ id: '1' });
  };
  await api.authenticatedRequest('/packages', { method: 'POST', body: form });
});

test('reference selectors retrieve all pages instead of dropping items after the first twenty', async () => {
  const pages = [];
  global.fetch = async (url) => {
    const page = Number(new URL(url).searchParams.get('page'));
    pages.push(page);
    return json({
      count: 21, next: page === 1 ? 2 : null, previous: page === 2 ? 1 : null,
      results: page === 1 ? Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1) })) : [{ id: '21' }],
    });
  };
  const records = await domain.allRecords('/providers');
  assert.deepEqual(pages, [1, 2]);
  assert.equal(records.length, 21);
  assert.equal(records[20].id, '21');
});
