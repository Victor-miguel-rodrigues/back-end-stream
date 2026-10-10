import 'dotenv/config';
import app from './serve';

// Usado apenas para rodar localmente (npm run dev / npm start).
// Na Vercel o app e importado direto de serve.ts, sem listen.
const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
    console.log(`[API] Rodando em http://localhost:${PORT}`);
    console.log(`[API] Ambiente: ${process.env.NODE_ENV ?? 'development'}`);
});
