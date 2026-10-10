"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const serve_1 = __importDefault(require("./serve"));
// Usado apenas para rodar localmente (npm run dev / npm start).
// Na Vercel o app e importado direto de serve.ts, sem listen.
const PORT = Number(process.env.PORT ?? 3000);
serve_1.default.listen(PORT, () => {
    console.log(`[API] Rodando em http://localhost:${PORT}`);
    console.log(`[API] Ambiente: ${process.env.NODE_ENV ?? 'development'}`);
});
//# sourceMappingURL=server.js.map