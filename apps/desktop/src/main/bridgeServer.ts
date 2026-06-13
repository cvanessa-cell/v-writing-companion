import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { BridgeRequestSchema, SuggestRequestSchema } from '@v/shared';
import { getSetting } from './database';

type RouteHandler = (body: unknown) => Promise<unknown> | unknown;

export interface BridgeRoutes {
  rewrite: RouteHandler;
  suggest: RouteHandler;
  settings: RouteHandler;
}

let server: ReturnType<typeof createServer> | null = null;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

export function startBridgeServer(routes: BridgeRoutes): number {
  const port = Number(getSetting('bridge_port', '47821'));
  if (server) server.close();

  server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (req.url === '/health' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, service: 'v-bridge' });
        return;
      }

      if (req.url === '/settings' && req.method === 'GET') {
        sendJson(res, 200, await routes.settings({}));
        return;
      }

      if (req.url === '/rewrite-request' && req.method === 'POST') {
        const raw = await readBody(req);
        const parsed = BridgeRequestSchema.parse(JSON.parse(raw));
        sendJson(res, 200, await routes.rewrite(parsed));
        return;
      }

      if (req.url === '/suggest-request' && req.method === 'POST') {
        const raw = await readBody(req);
        const parsed = SuggestRequestSchema.parse(JSON.parse(raw));
        sendJson(res, 200, await routes.suggest(parsed));
        return;
      }

      res.writeHead(404);
      res.end();
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid bridge request',
      });
    }
  });

  server.listen(port, '127.0.0.1');
  return port;
}

export function stopBridgeServer(): void {
  server?.close();
  server = null;
}
