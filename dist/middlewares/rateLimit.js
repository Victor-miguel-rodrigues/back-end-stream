"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sensitiveLimiter = exports.apiLimiter = exports.loginLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Chave por IP + email para evitar bypass com emails diferentes
const loginKeyGenerator = (req) => {
    const ip = (req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0');
    const email = (req.body?.email ?? 'unknown');
    return `${ip}-${email}`;
};
// Limite para login: 5 tentativas a cada 15 minutos por IP+email
exports.loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { mensagem: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: loginKeyGenerator
});
// Limite geral: 100 requisicoes a cada 15 minutos por IP
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { mensagem: 'Muitas requisicoes. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    // Preflight e heartbeat nao contam: se tomarem 429 o front nao detecta o logout
    skip: (req) => req.method === 'OPTIONS' || req.path === '/heartbeat'
});
// Limite para rotas sensiveis (cadastro): 3 tentativas por hora por IP
exports.sensitiveLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { mensagem: 'Muitas tentativas. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false
});
exports.default = { loginLimiter: exports.loginLimiter, apiLimiter: exports.apiLimiter, sensitiveLimiter: exports.sensitiveLimiter };
//# sourceMappingURL=rateLimit.js.map