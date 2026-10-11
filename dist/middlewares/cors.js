"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsMiddleware = exports.corsOptions = void 0;
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Origens permitidas: usa env CORS_ORIGINS ou lista padrao
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://meu-front-rose.vercel.app',
        'https://back-end-stream.vercel.app',
    ];
const normalize = (origin) => origin.replace(/\/$/, '');
// Origens do app instalado no celular (WebView do Capacitor): nao e um dominio publico, a origem e fixa.
// Android (androidScheme: https) -> https://localhost | iOS -> capacitor://localhost | Ionic -> ionic://localhost
const appOrigins = ['https://localhost', 'capacitor://localhost', 'ionic://localhost'];
exports.corsOptions = {
    origin: (origin, callback) => {
        // Permite requests sem origin (Postman, server-to-server, mobile)
        if (!origin)
            return callback(null, true);
        const cleanOrigin = normalize(origin);
        // Permite qualquer subdominio .vercel.app
        if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(cleanOrigin)) {
            return callback(null, true);
        }
        // Permite localhost em qualquer porta
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
            return callback(null, true);
        }
        // Permite o app mobile (Capacitor/Ionic)
        if (appOrigins.includes(cleanOrigin)) {
            return callback(null, true);
        }
        const isAllowed = allowedOrigins.some(o => normalize(o) === cleanOrigin);
        if (isAllowed)
            return callback(null, true);
        callback(new Error('Origem nao permitida pelo CORS: ' + origin));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-secret'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
};
exports.corsMiddleware = (0, cors_1.default)(exports.corsOptions);
exports.default = { corsOptions: exports.corsOptions, corsMiddleware: exports.corsMiddleware };
//# sourceMappingURL=cors.js.map