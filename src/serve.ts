import express from "express";
import cors from "cors";
import "dotenv/config";
import router from "./routing/routing";
import adminRoutes from "./routing/adminRoutes"; // 🔴 ADICIONADO O NOME adminRoutes

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas principais
app.use(router);

// Rotas admin
app.use(adminRoutes);

export default app;