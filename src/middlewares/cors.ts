import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Origens permitidas: usa env CORS_ORIGINS ou lista padrao
const allowedOrigins: string[] = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://meu-front-rose.vercel.app',
        'https://back-end-stream.vercel.app',
    ];

const normalize = (origin: string): string => origin.replace(/\/$/, '');

export const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        // Permite requests sem origin (Postman, server-to-server, mobile)
        if (!origin) return callback(null, true);

        const cleanOrigin = normalize(origin);

        // Permite qualquer subdominio .vercel.app
        if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(cleanOrigin)) {
            return callback(null, true);
        }

        // Permite localhost em qualquer porta
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
            return callback(null, true);
        }

        const isAllowed = allowedOrigins.some(o => normalize(o) === cleanOrigin);
        if (isAllowed) return callback(null, true);

        callback(new Error('Origem nao permitida pelo CORS: ' + origin));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-secret'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
};

export const corsMiddleware = cors(corsOptions);

export default { corsOptions, corsMiddleware };