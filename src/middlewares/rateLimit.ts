import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Limite para login
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 tentativas por IP
    message: {
        mensagem: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
        return `${req.ip}-${req.body?.email || 'unknown'}`;
    }
});

// Limite geral para API
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requisições por IP
    message: {
        mensagem: 'Muitas requisições. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Limite para rotas sensíveis (ex: mudar senha)
export const sensitiveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // 3 tentativas por IP
    message: {
        mensagem: 'Muitas tentativas. Tente novamente em 1 hora.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

export default {
    loginLimiter,
    apiLimiter,
    sensitiveLimiter
};