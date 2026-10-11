import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';

// Chave por IP + email para evitar bypass com emails diferentes
const loginKeyGenerator = (req: Request): string => {
    // ipKeyGenerator agrupa enderecos IPv6 por sub-rede (evita burlar o limite trocando de IPv6)
    const ip = ipKeyGenerator((req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0') as string);
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

// Limite do envio/geracao de codigo de login: 10 por minuto por USUARIO (depois do validarToken).
// Sem usuario na requisicao, cai para o IP. Evita autoclick/flood gravando codigos no banco.
const codigoLoginKeyGenerator = (req: Request): string => {
    const usuarioId = (req as any).usuario?.id;
    if (usuarioId !== undefined) return `u:${usuarioId}`;
    return `ip:${ipKeyGenerator((req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0') as string)}`;
};

export const codigoLoginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { mensagem: 'Muitos codigos em pouco tempo. Aguarde 1 minuto.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: codigoLoginKeyGenerator
});

<<<<<<< HEAD
export default { loginLimiter, apiLimiter, sensitiveLimiter, codigoLoginLimiter };
=======
// Rota PUBLICA do app (sem login): 6 por minuto por aparelho (device_id). Sem device_id valido, por IP.
const codigoAppKeyGenerator = (req: Request): string => {
    const id = (req as any).body?.device_id;
    if (typeof id === 'string' && /^[A-Za-z0-9._-]{8,80}$/.test(id)) return `d:${id}`;
    return `ip:${ipKeyGenerator((req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0') as string)}`;
};

export const codigoAppLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 6,
    message: { mensagem: 'Muitos codigos em pouco tempo. Aguarde 1 minuto.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: codigoAppKeyGenerator
});

export default { loginLimiter, apiLimiter, sensitiveLimiter, codigoLoginLimiter, codigoAppLimiter };
>>>>>>> 9e7a2b4 (rebase)
