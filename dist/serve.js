"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const routing_1 = __importDefault(require("./routing/routing"));
const adminRoutes_1 = __importDefault(require("./routing/adminRoutes")); // 🔴 ADICIONADO O NOME adminRoutes
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Rotas principais
app.use(routing_1.default);
// Rotas admin
app.use(adminRoutes_1.default);
exports.default = app;
//# sourceMappingURL=serve.js.map