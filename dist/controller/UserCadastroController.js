"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userCadastroController = void 0;
const connection_1 = __importDefault(require("../database/connection"));
class userCadastroController {
    listar(req, res) {
        return res.json({
            mensage: "Funcionado direitinho",
            status: true,
            dados: [],
        });
    }
    async receber(req, res) {
        try {
            const { nome, email, senha } = req.body;
            const resultado = await connection_1.default.query(`INSERT INTO usuarios (nome, email,senha)
                  VALUES ($1, $2,$3)
                  RETURNING id, nome, email,senha`, [nome, email, senha]);
            return res.status(201).json({
                status: true,
                message: "Usuário cadastrado com sucesso",
                dados: resultado.rows[0]
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({
                status: false,
                message: "Erro ao cadastrar usuário"
            });
        }
    }
    async logar(req, res) {
        try {
            const { email, senha } = req.body;
            const resultado = await connection_1.default.query(`SELECT id, nome, email, senha
               FROM usuarios
               WHERE email = $1
               AND senha = $2
               LIMIT 1`, [email, senha]);
            if (resultado.rows.length === 0) {
                return res.status(401).json({
                    status: false,
                    message: "Email ou senha inválidos"
                });
            }
            const usuario = resultado.rows[0];
            return res.status(200).json({
                status: true,
                message: "Login realizado com sucesso",
                dados: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email
                }
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({
                status: false,
                message: "Erro interno do servidor"
            });
        }
    }
}
exports.userCadastroController = userCadastroController;
//# sourceMappingURL=UserCadastroController.js.map