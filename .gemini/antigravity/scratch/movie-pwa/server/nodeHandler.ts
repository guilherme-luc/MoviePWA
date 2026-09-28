import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRecommendationHandler, type RecommendationEnvironment } from './recommendation.ts';

export function createNodeHandler(env: RecommendationEnvironment) {
    const handle = createRecommendationHandler(env);
    return async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
        try {
            let body: string | undefined;
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                if (req.body !== undefined) body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
                else {
                    const chunks: Buffer[] = [];
                    let bytes = 0;
                    for await (const chunk of req) {
                        const buffer = Buffer.from(chunk);
                        bytes += buffer.length;
                        if (bytes > 65536) { res.writeHead(413); res.end(); return; }
                        chunks.push(buffer);
                    }
                    body = Buffer.concat(chunks).toString('utf8');
                }
                if (Buffer.byteLength(body || '') > 65536) { res.writeHead(413); res.end(); return; }
            }
            const controller = new AbortController();
            res.on('close', () => { if (!res.writableEnded) controller.abort(); });
            const headers = new Headers();
            for (const [key, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(',') : value);
            const result = await handle(new Request('http://localhost/api/recommend', { method: req.method, headers, body, signal: controller.signal }));
            result.headers.forEach((value, key) => res.setHeader(key, value));
            res.writeHead(result.status);
            res.end(await result.text());
        } catch {
            res.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify({ error: 'Não foi possível consultar a IA.' }));
        }
    };
}
