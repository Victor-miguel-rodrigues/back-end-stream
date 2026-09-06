"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sensitiveLimiter = exports.apiLimiter = exports.loginLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Limite para login
exports.loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 tentativas por IP
    message: {
        mensagem: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return `${req.ip}-${req.body?.email || 'unknown'}`;
    }
});
// Limite geral para API
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requisições por IP
    message: {
        mensagem: 'Muitas requisições. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
// Limite para rotas sensíveis (ex: mudar senha)
exports.sensitiveLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // 3 tentativas por IP
    message: {
        mensagem: 'Muitas tentativas. Tente novamente em 1 hora.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
exports.default = {
    loginLimiter: exports.loginLimiter,
    apiLimiter: exports.apiLimiter,
    sensitiveLimiter: exports.sensitiveLimiter
};
//# sourceMappingURL=rateLimit.js.map