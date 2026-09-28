import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React from 'react';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage, HTMLElement: dom.window.HTMLElement });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
const { render, screen, fireEvent, waitFor, cleanup } = await import('@testing-library/react');
const { SmartSuggestionModal } = await import('../src/components/modals/SmartSuggestionModal.tsx');
const { CollectionProvider } = await import('../src/providers/CollectionProvider.tsx');
const nativeFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = nativeFetch; localStorage.clear(); sessionStorage.clear(); });
const unseen = { barcode: '', title: 'Filme novo', year: '2000', genre: 'Comédia', duration: '1h 30m', watched: false };
const seen = { ...unseen, title: 'Filme visto', watched: true };
function mount(movies, onClose = () => {}) {
    sessionStorage.setItem('collection_format', 'DVD');
    localStorage.setItem('user_dvd_spreadsheet_id', 'test-sheet');
    window.gapi = { client: { getToken: () => ({ access_token: 'fake-token' }) } };
    return render(React.createElement(CollectionProvider, null, React.createElement(SmartSuggestionModal, { isOpen: true, onClose, movies })));
}
async function start(duration = 'Tanto faz') {
    await waitFor(() => assert.equal(screen.getByRole('button', { name: 'Começar' }).disabled, false));
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    fireEvent.click(screen.getByRole('button', { name: /Surpreenda-me/ }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(duration) }));
}

test('clique em Algo NOVO envia a preferência recém-escolhida e só filmes não assistidos', async () => {
    let sent;
    globalThis.fetch = async (_url, options) => {
        if (options?.method !== 'POST') return Response.json({ available: true });
        sent = JSON.parse(options.body);
        return Response.json({ movieId: 'candidate-1', reasoning: 'Escolha de comédia.' });
    };
    mount([unseen, seen]);
    await start();
    fireEvent.click(screen.getByRole('button', { name: /Algo NOVO/ }));
    await screen.findByText('Filme novo');
    assert.equal(sent.preferences.status, 'new');
    assert.deepEqual(sent.candidates.map(candidate => candidate.title), ['Filme novo']);
    fireEvent.click(screen.getByRole('button', { name: 'Gostei' }));
    assert.match(localStorage.getItem('movie_recommendations_v1:DVD:test-sheet'), /"feedback":"like"/);
});

test('clique em Rever envia apenas assistidos', async () => {
    let sent;
    globalThis.fetch = async (_url, options) => {
        if (options?.method !== 'POST') return Response.json({ available: true });
        sent = JSON.parse(options.body);
        return Response.json({ movieId: 'candidate-1', reasoning: 'Para rever.' });
    };
    mount([unseen, seen]);
    await start();
    fireEvent.click(screen.getByRole('button', { name: /Rever um Favorito/ }));
    await screen.findByText('Filme visto');
    assert.equal(sent.preferences.status, 'rewatch');
    assert.equal(sent.candidates.length, 1);
});

test('sem correspondência não chama IA; flexibilizar tempo preserva novo', async () => {
    let sent;
    globalThis.fetch = async (_url, options) => {
        if (options?.method !== 'POST') return Response.json({ available: true });
        sent = JSON.parse(options.body);
        return Response.json({ movieId: 'candidate-1', reasoning: 'Escolha após aceitar outra duração.' });
    };
    mount([{ ...unseen, duration: '3h' }, seen]);
    await start('Rapidinho');
    fireEvent.click(screen.getByRole('button', { name: /Algo NOVO/ }));
    await screen.findByText('Nenhum filme atende aos filtros');
    assert.equal(sent, undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar qualquer duração' }));
    await screen.findByText('Filme novo');
    assert.equal(sent.preferences.status, 'new');
    assert.equal(sent.preferences.duration, 'any');
    assert.equal(sent.candidates.length, 1);
});

test('falha da IA não vira sorteio e alternativa local é explícita', async () => {
    globalThis.fetch = async (_url, options) => options?.method === 'POST'
        ? Response.json({ error: 'Cota atingida.' }, { status: 429 })
        : Response.json({ available: true });
    mount([unseen]);
    await start();
    fireEvent.click(screen.getByRole('button', { name: /Algo NOVO/ }));
    await screen.findByText('A IA não conseguiu recomendar');
    assert.equal(screen.queryByText('Filme novo'), null);
    fireEvent.click(screen.getByRole('button', { name: 'Usar sugestão local sem IA' }));
    await screen.findByText('Filme novo');
    assert.ok(screen.getByText('Sugestão local — sem IA'));
    assert.equal(screen.queryByText('Gemini AI'), null);
});

test('resposta fora dos candidatos é rejeitada também no navegador', async () => {
    globalThis.fetch = async (_url, options) => options?.method === 'POST'
        ? Response.json({ movieId: 'candidate-99', reasoning: 'Fora da lista' })
        : Response.json({ available: true });
    mount([unseen]);
    await start();
    fireEvent.click(screen.getByRole('button', { name: /Algo NOVO/ }));
    await screen.findByText('A IA não conseguiu recomendar');
    assert.equal(screen.queryByText('Filme novo'), null);
});

test('fechar durante a consulta cancela a sessão e não grava um resultado atrasado', async () => {
    let resolveResponse;
    let sentSignal;
    globalThis.fetch = async (_url, options) => {
        if (options?.method !== 'POST') return Response.json({ available: true });
        sentSignal = options.signal;
        return new Promise(resolve => { resolveResponse = resolve; });
    };
    const view = mount([unseen]);
    await start();
    fireEvent.click(screen.getByRole('button', { name: /Algo NOVO/ }));
    await waitFor(() => assert.ok(resolveResponse));
    view.unmount();
    assert.equal(sentSignal.aborted, true);
    resolveResponse(Response.json({ movieId: 'candidate-1', reasoning: 'Resposta atrasada.' }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(localStorage.getItem('movie_recommendations_v1:DVD:test-sheet'), null);
});
