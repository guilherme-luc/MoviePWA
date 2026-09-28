import test from 'node:test';
import assert from 'node:assert/strict';
import { filterMovies, durationMinutes, defaultPreferences } from '../src/utils/recommendations.ts';

const movie = (overrides = {}) => ({ barcode: '1', title: 'Filme', year: '2000', genre: 'Comédia', duration: '1h 30m', watched: false, ...overrides });
test('novo e rever respeitam a resposta selecionada', () => {
    const unseen = movie();
    const seen = movie({ barcode: '2', watched: true });
    assert.deepEqual(filterMovies([unseen, seen], { ...defaultPreferences, status: 'new' }), [unseen]);
    assert.deepEqual(filterMovies([unseen, seen], { ...defaultPreferences, status: 'rewatch' }), [seen]);
});
test('limites de duração e formatos de entrada', () => {
    for (const [input, expected] of [['1h 40m', 100], ['90 min', 90], ['90', 90], ['2:20', 140], ['2h', 120], ['', null], ['?', null], ['0', null]]) {
        assert.equal(durationMinutes(input), expected);
    }
    const movies = [99, 100, 140, 141].map(minutes => movie({ duration: String(minutes) }));
    assert.deepEqual(filterMovies(movies, { ...defaultPreferences, duration: 'medium' }), movies.slice(1, 3));
    assert.deepEqual(filterMovies([movie({ duration: '' })], { ...defaultPreferences, duration: 'short' }), []);
});
test('nenhum resultado não descarta filtros; flexibilização preserva os demais', () => {
    const movies = [movie({ watched: true }), movie({ duration: '3h' })];
    const preferences = { ...defaultPreferences, status: 'new', duration: 'short' };
    assert.deepEqual(filterMovies(movies, preferences), []);
    assert.deepEqual(filterMovies(movies, { ...preferences, duration: 'any' }), [movies[1]]);
    assert.deepEqual(filterMovies([], defaultPreferences), []);
});
test('gêneros e tags aceitam acentos e mantêm o clima escolhido', () => {
    const movies = [movie({ genre: 'Acao' }), movie({ genre: 'Drama', tags: ['Ação'] }), movie()];
    assert.deepEqual(filterMovies(movies, { ...defaultPreferences, mood: 'adrenaline' }), movies.slice(0, 2));
});

import { rankMovies, buildCandidates, parseRecommendation, movieKey, readHistory, saveHistory } from '../src/utils/recommendations.ts';

test('afinidade seleciona um filme compatível além dos primeiros vinte e não altera a coleção', () => {
    const movies = Array.from({ length: 25 }, (_, i) => movie({ barcode: String(i), title: `Filme ${i}` }));
    movies[24] = movie({ barcode: '24', synopsis: 'Uma sátira com crítica social e humor ácido.', userRating: '9' });
    const ranked = rankMovies(movies, { ...defaultPreferences, mood: 'laugh', subMood: 'satire' });
    assert.equal(ranked[0], movies[24]);
    assert.equal(movies[0].barcode, '0');
    assert.equal(buildCandidates(ranked).length, 20);
});

test('IDs únicos mesmo com códigos de barras ausentes ou duplicados', () => {
    const candidates = buildCandidates([movie({ barcode: '' }), movie({ barcode: '' }), movie()]);
    assert.equal(new Set(candidates.map(candidate => candidate.id)).size, 3);
    assert.equal(parseRecommendation({ movieId: candidates[1].id, reasoning: 'Combina com a sua escolha.' }, candidates).movieId, candidates[1].id);
    for (const value of [null, {}, { movieId: 'inexistente', reasoning: 'Teste' }, { movieId: candidates[0].id, reasoning: '' }, { movieId: candidates[0].id, reasoning: 2 }]) {
        assert.throws(() => parseRecommendation(value, candidates));
    }
});

test('contexto autorizado é limitado e não inclui imagens nem dados internos da planilha', () => {
    const candidates = buildCandidates([movie({ synopsis: 'a'.repeat(1000), tags: Array(12).fill('tag'), userRating: '8', director: 'Diretor', imageValue: 'private-image', _sheetTitle: 'private-sheet' })]);
    assert.equal(candidates[0].synopsis.length, 700);
    assert.equal(candidates[0].tags.length, 8);
    assert.equal(candidates[0].userRating, '8');
    assert.equal(candidates[0].director, 'Diretor');
    assert.equal('imageValue' in candidates[0], false);
    assert.equal('_sheetTitle' in candidates[0], false);
});

test('histórico reduz repetição sem descartar filtros e feedback muda afinidade', () => {
    const movies = [movie(), movie({ barcode: '2' }), movie({ barcode: '3', watched: true })];
    const now = Date.now();
    const event = { id: 'event', movieKey: movieKey(movies[0]), at: now, source: 'ai' };
    assert.equal(rankMovies(movies, { ...defaultPreferences, status: 'new' }, [event], now)[0], movies[1]);
    const old = { ...event, at: now - 40 * 86400000, feedback: 'like' };
    assert.equal(rankMovies(movies.slice(0, 2), defaultPreferences, [old], now)[0], movies[0]);
    assert.equal(rankMovies(movies.slice(0, 2), defaultPreferences, [{ ...old, feedback: 'dislike' }], now)[0], movies[1]);
});

test('histórico é limitado, separado por coleção e tolera armazenamento indisponível ou corrompido', () => {
    const data = new Map();
    const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
    const history = Array.from({ length: 150 }, (_, i) => ({ id: String(i), movieKey: 'movie', at: i, source: 'local' }));
    assert.equal(saveHistory(storage, 'DVD:account1', history), true);
    assert.equal(readHistory(storage, 'DVD:account1').length, 100);
    assert.deepEqual(readHistory(storage, 'DVD:account2'), []);
    assert.deepEqual(readHistory({ getItem: () => '{invalid' }, 'scope'), []);
    assert.equal(saveHistory({ setItem: () => { throw new Error('Full'); } }, 'scope', history), false);
});
