import { Router } from "express";
import { userCadastroController } from "../controller/UserCadastroController";
import { validarUsuario, validarLogin } from "../validators/userValidator";
import pool from "../database/connection";
const router = Router();

const controller = new userCadastroController();

router.get("/", controller.listar);

router.post(
    "/cadastrar",
    validarUsuario,
    controller.receber
);

router.post(
  "/login",
   validarLogin,
    controller.logar
);

router.get("/teste-env", (req, res) => {
    try {
        const url = new URL(process.env.DATABASE_URL!);

        return res.json({
            existe: true,
            host: url.hostname,
            port: url.port,
            database: url.pathname
        });

    } catch (error) {
        return res.status(500).json({
            existe: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

export default router;
