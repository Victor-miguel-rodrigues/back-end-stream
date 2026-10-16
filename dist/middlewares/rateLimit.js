"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pedidoLimiter = exports.codigoUsarLimiter = exports.codigoAppLimiter = exports.codigoLoginLimiter = exports.sensitiveLimiter = exports.apiLimiter = exports.loginLimiter = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
// Chave por IP + email para evitar bypass com emails diferentes
const loginKeyGenerator = (req) => {
    // ipKeyGenerator agrupa enderecos IPv6 por sub-rede (evita burlar o limite trocando de IPv6)
    const ip = (0, express_rate_limit_1.ipKeyGenerator)((req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0'));
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
// Limite do envio/geracao de codigo de login: 10 por minuto por USUARIO (depois do validarToken).
// Sem usuario na requisicao, cai para o IP. Evita autoclick/flood gravando codigos no banco.
const codigoLoginKeyGenerator = (req) => {
    const usuarioId = req.usuario?.id;
    if (usuarioId !== undefined)
        return `u:${usuarioId}`;
    return `ip:${(0, express_rate_limit_1.ipKeyGenerator)((req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0'))}`;
};
exports.codigoLoginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    message: { mensagem: 'Muitos codigos em pouco tempo. Aguarde 1 minuto.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: codigoLoginKeyGenerator
});
// Rota PUBLICA do app (sem login): 6 por minuto por aparelho (device_id). Sem device_id valido, por IP.
const codigoAppKeyGenerator = (req) => {
    const id = req.body?.device_id;
    if (typeof id === 'string' && /^[A-Za-z0-9._-]{8,80}$/.test(id))
        return `d:${id}`;
    return `ip:${(0, express_rate_limit_1.ipKeyGenerator)((req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0'))}`;
};
exports.codigoAppLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 6,
    message: { mensagem: 'Muitos codigos em pouco tempo. Aguarde 1 minuto.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: codigoAppKeyGenerator
});
// Rota PUBLICA do site (inserir codigo): 10 por minuto por IP, para barrar tentativa de adivinhar codigos.
exports.codigoUsarLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    message: { mensagem: 'Muitas tentativas. Aguarde 1 minuto.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (0, express_rate_limit_1.ipKeyGenerator)((req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0'))
});
// Pedido de conta (publico): 3 por hora por IP — evita lotar a tabela de pedidos
exports.pedidoLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { status: false, message: 'Muitas solicitacoes. Tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false
});
exports.default = {
    loginLimiter: exports.loginLimiter,
    apiLimiter: exports.apiLimiter,
    sensitiveLimiter: exports.sensitiveLimiter,
    codigoLoginLimiter: exports.codigoLoginLimiter,
    codigoAppLimiter: exports.codigoAppLimiter,
    codigoUsarLimiter: exports.codigoUsarLimiter,
    pedidoLimiter: exports.pedidoLimiter
};
//# sourceMappingURL=rateLimit.js.map