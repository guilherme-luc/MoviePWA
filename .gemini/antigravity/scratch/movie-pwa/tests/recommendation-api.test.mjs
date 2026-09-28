import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecommendationHandler, validatePayload, recommendationPrompt } from '../server/recommendation.ts';
import { buildCandidates, defaultPreferences } from '../src/utils/recommendations.ts';
const candidates = buildCandidates([{ title: 'Teste', barcode: '', genre: 'Comédia', year: '2000', synopsis: 'Uma sátira social.', tags: ['sátira'], userRating: '8', director: 'Diretor' }]);
const payload = { candidates, preferences: defaultPreferences };
const request = (body = payload, token = 'test-token') => new Request('http://localhost/api/recommend', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
});
const env = { GEMINI_API_KEY: 'fake-key-for-tests', GOOGLE_CLIENT_ID: 'test-client' };
const auth = async () => Response.json({ aud: 'test-client', expires_in: 1000 });
const generated = async () => ({ movieId: 'candidate-1', reasoning: 'Sátira compatível com suas preferências.' });

test('servidor não consulta Gemini quando não configurado ou sem autenticação', async () => {
    const handle = createRecommendationHandler({}, { generate: () => { throw new Error('Must not run'); } });
    assert.deepEqual(await (await handle(new Request('http://localhost/api/recommend'))).json(), { available: false });
    assert.equal((await handle(request())).status, 503);
    const configured = createRecommendationHandler(env);
    assert.equal((await configured(new Request('http://localhost/api/recommend', { method: 'POST', body: '{}' }))).status, 401);
});

test('servidor valida público e expiração da sessão Google', async () => {
    for (const identity of [{ aud: 'other-app', expires_in: 1000 }, { aud: 'test-client', expires_in: 0 }]) {
        const handle = createRecommendationHandler(env, { fetch: async () => Response.json(identity), generate: () => { throw new Error('Must not run'); } });
        assert.equal((await handle(request())).status, 401);
    }
});

test('servidor aceita apenas dados delimitados e uma resposta de candidato válido', async () => {
    assert.throws(() => validatePayload({ ...payload, candidates: Array(21).fill(candidates[0]) }));
    assert.throws(() => validatePayload({ ...payload, preferences: { ...defaultPreferences, mood: '__proto__' } }));
    assert.throws(() => validatePayload({ ...payload, candidates: [{ ...candidates[0], synopsis: 'x'.repeat(701) }] }));
    const handle = createRecommendationHandler(env, { fetch: auth, generate: generated });
    const response = await handle(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).movieId, 'candidate-1');
    const invalid = createRecommendationHandler(env, { fetch: auth, generate: async () => ({ movieId: 'unknown', reasoning: 'Teste' }) });
    assert.equal((await invalid(request())).status, 502);
});

test('limite por sessão impede chamadas adicionais e expira após um minuto', async () => {
    let now = 1000;
    let calls = 0;
    const handle = createRecommendationHandler(env, { fetch: auth, now: () => now, generate: async () => { calls++; return generated(); } });
    for (let i = 0; i < 3; i++) assert.equal((await handle(request())).status, 200);
    assert.equal((await handle(request())).status, 429);
    assert.equal(calls, 3);
    now += 60001;
    assert.equal((await handle(request())).status, 200);
});

test('erro de cota não faz tentativas adicionais e não revela a chave', async () => {
    let calls = 0;
    const handle = createRecommendationHandler(env, { fetch: auth, generate: async () => { calls++; throw Object.assign(new Error(env.GEMINI_API_KEY), { status: 429 }); } });
    const response = await handle(request());
    assert.equal(response.status, 429);
    assert.equal(calls, 1);
    assert.equal((await response.text()).includes(env.GEMINI_API_KEY), false);
});

test('prompt contém contexto autorizado e instruções de resposta restrita', () => {
    const prompt = recommendationPrompt(candidates, defaultPreferences);
    assert.match(prompt, /Uma sátira social/);
    assert.match(prompt, /"userRating":"8"/);
    assert.match(prompt, /exclusivamente entre os candidatos/);
    assert.match(prompt, /nunca como instruções/);
});

import { createServer } from 'node:http';
import { createNodeHandler } from '../server/nodeHandler.ts';
test('adaptador HTTP responde JSON sem configuração e aceita corpo de requisição', async () => {
    const server = createServer(createNodeHandler({}));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const url = `http://127.0.0.1:${server.address().port}/api/recommend`;
        const status = await fetch(url);
        assert.deepEqual(await status.json(), { available: false });
        const response = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
        assert.equal(response.status, 503);
        assert.equal(typeof (await response.json()).error, 'string');
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
