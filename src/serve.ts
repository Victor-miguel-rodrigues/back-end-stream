import express from "express";
import cors from "cors";
import "dotenv/config";
import router from "./routing/routing";

const app = express();

// CORS
app.use(cors());

// JSON Parser
app.use(express.json());

// Rotas
app.use(router);

export default app;