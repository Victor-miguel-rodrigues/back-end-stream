"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const cors_1 = require("./middlewares/cors");
const routing_1 = __importDefault(require("./routing/routing"));
const app = (0, express_1.default)();
// ============================================
// CORS - DEVE VIR ANTES DE QUALQUER ROTA
// ============================================
app.use(cors_1.corsLogger);
app.use(cors_1.corsMiddleware);
// ============================================
// PARSERS
// ============================================
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// ============================================
// ROTAS
// ============================================
app.use(routing_1.default);
// ============================================
// TRATAMENTO DE ERRO 404
// ============================================
app.use((req, res) => {
    res.status(404).json({
        status: false,
        message: "Rota nao encontrada",
        path: req.url
    });
});
exports.default = app;
//# sourceMappingURL=serve.js.map