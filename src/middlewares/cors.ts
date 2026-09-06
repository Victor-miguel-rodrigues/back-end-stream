import cors, { CorsOptions } from 'cors';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

// Configuração de CORS
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5500', 'http://127.0.0.1:5500'];

export const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Permitir requisições sem origin (ex: Postman, mobile apps)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            console.warn(` CORS bloqueado para origem: ${origin}`);
            callback(new Error('Não permitido por CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] as cors.CorsOptions['methods'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
};

// Middleware de CORS
export const corsMiddleware = cors(corsOptions);

// Middleware para log de CORS
export const corsLogger = (req: Request, res: Response, next: NextFunction): void => {
    console.log(` ${req.method} ${req.url} - Origin: ${req.headers.origin || 'Sem origem'}`);
    next();
};

export default {
    corsOptions,
    corsMiddleware,
    corsLogger
};