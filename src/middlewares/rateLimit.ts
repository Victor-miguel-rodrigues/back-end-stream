import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Chave por IP + email para evitar bypass com emails diferentes
const loginKeyGenerator = (req: Request): string => {
    const ip = (req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0') as string;
    const email = (req.body?.email ?? 'unknown') as string;
    return `${ip}-${email}`;
};

// Limite para login: 5 tentativas a cada 15 minutos por IP+email
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { mensagem: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: loginKeyGenerator
});

// Limite geral: 100 requisicoes a cada 15 minutos por IP
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { mensagem: 'Muitas requisicoes. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    // Preflight e heartbeat nao contam: se tomarem 429 o front nao detecta o logout
    skip: (req: Request) => req.method === 'OPTIONS' || req.path === '/heartbeat'
});

// Limite para rotas sensiveis (cadastro): 3 tentativas por hora por IP
export const sensitiveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { mensagem: 'Muitas tentativas. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false
});

export default { loginLimiter, apiLimiter, sensitiveLimiter };