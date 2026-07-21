import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { assistantRoutes } from './routes/assistant.routes.js';
import { companyRoutes } from './routes/company.routes.js';
import { interviewRoutes } from './routes/interview.routes.js';
import { transcriptRoutes } from './routes/transcript.routes.js';
import { registerWebsocket } from './websocket/gateway.js';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverDirectory, '../../../.env') });

// Fastify's default bodyLimit (1 MiB) is fine for JSON, but far too small for a
// full interview recording upload (video + audio, tens to hundreds of MB) — the
// multipart plugin falls back to this same limit unless given its own.
const RECORDING_UPLOAD_LIMIT_BYTES = 500 * 1024 * 1024;

const app = Fastify({ logger: true, bodyLimit: RECORDING_UPLOAD_LIMIT_BYTES });
await app.register(cors, { origin: true, credentials: true });
await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });
await app.register(multipart, { limits: { fileSize: RECORDING_UPLOAD_LIMIT_BYTES } });
await app.register(websocket);
app.get('/health', async () => ({ ok: true, service: 'interviehire-api' }));
await app.register(companyRoutes, { prefix: '/api/company' });
await app.register(interviewRoutes, { prefix: '/api/interview' });
await app.register(transcriptRoutes, { prefix: '/api/interviews' });
await app.register(assistantRoutes, { prefix: '/api/assistant' });
await registerWebsocket(app);

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: '0.0.0.0' }).catch(err => { app.log.error(err); process.exit(1); });
