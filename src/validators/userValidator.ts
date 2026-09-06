import { Request, Response, NextFunction } from "express";

export function validarUsuario(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const { nome, email, senha } = req.body;

    if (!nome || typeof nome !== "string" || nome.trim() === "") {
        return res.status(400).json({
            status: false,
            message: "Nome é obrigatório"
        });
    }

    if (!email || typeof email !== "string" || email.trim() === "") {
        return res.status(400).json({
            status: false,
            message: "Email é obrigatório"
        });
  }
  if (!senha || typeof senha !== "string" || senha.trim() === "") {
      return res.status(400).json({
          status: false,
          message: "senha é obrigatório"
      });
  }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValido.test(email)) {
        return res.status(400).json({
            status: false,
            message: "Email inválido"
        });
    }

    next();
}

export function validarLogin(
    req: Request,
    res: Response,
    next: NextFunction
) {

    const { email, senha } = req.body;

    if (!email || typeof email !== "string") {
        return res.status(400).json({
            status: false,
            message: "Email é obrigatório"
        });
    }

    if (!senha || typeof senha !== "string") {
        return res.status(400).json({
            status: false,
            message: "Senha é obrigatória"
        });
    }

    next();
}
