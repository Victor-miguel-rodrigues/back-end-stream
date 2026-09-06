import { Request, Response } from "express";
import { PoolClient } from "pg";
import pool, { query, transaction } from "../database/connection";
import { sha256, gerarToken, compararSenha } from "../utils/crypto";

// ============================================
// CONTROLLER UNIFICADO
// ============================================
export class UserCadastroController {
    // ============================================
    // LISTAR (TESTE)
    // ============================================
    listar(req: any, res: any) {
        return res.json({
            mensage: "Funcionado direitinho",
            status: true,
            dados: [],
        });
    }

    // ============================================
    // CADASTRAR USUÁRIO (COM CRIPTOGRAFIA)
    // ============================================
    async receber(req: Request, res: Response) {
        try {
            const { nome_usuario, email, senha } = req.body;

            // Validar se os campos existem
            if (!nome_usuario || !email || !senha) {
                return res.status(400).json({
                    status: false,
                    message: "Nome, email e senha são obrigatórios"
                });
            }

            // Validar email
            const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailValido.test(email)) {
                return res.status(400).json({
                    status: false,
                    message: "Email inválido"
                });
            }

            // Validar senha (mínimo 6 caracteres)
            if (senha.length < 6) {
                return res.status(400).json({
                    status: false,
                    message: "Senha deve ter pelo menos 6 caracteres"
                });
            }

            // Verificar se email já existe
            const existeResult = await query(
                "SELECT id FROM usuarios WHERE email = $1",
                [email]
            );

            if (existeResult.rows.length > 0) {
                return res.status(409).json({
                    status: false,
                    message: "Email já cadastrado"
                });
            }

            // Criptografar a senha
            const senhaHash = sha256(senha);

            // Inserir usuário usando transaction
            const resultado = await transaction(async (client: PoolClient) => {
                // Inserir usuário
                const insertResult = await client.query(
                    `INSERT INTO usuarios (nome_usuario, email, senha_hash) 
                     VALUES ($1, $2, $3) 
                     RETURNING id, nome_usuario, email, data_cadastro`,
                    [nome_usuario.trim(), email.trim(), senhaHash]
                );

                // Registrar log
                await client.query(
                    `INSERT INTO logs_sistema (usuario_id, acao, descricao, ip)
                     VALUES ($1, $2, $3, $4)`,
                    [insertResult.rows[0].id, "cadastro", "Novo usuário cadastrado", req.ip || "0.0.0.0"]
                );

                return insertResult.rows[0];
            });

            return res.status(201).json({
                status: true,
                message: "Usuário cadastrado com sucesso",
                dados: {
                    id: resultado.id,
                    nome_usuario: resultado.nome_usuario,
                    email: resultado.email,
                    data_cadastro: resultado.data_cadastro
                }
            });

        } catch (error) {
            console.error("❌ Erro ao cadastrar usuário:", error);
            return res.status(500).json({
                status: false,
                message: "Erro ao cadastrar usuário"
            });
        }
    }

    // ============================================
    // LOGIN (COM TOKEN E SESSÃO)
    // ============================================
    async logar(req: Request, res: Response) {
        try {
            const { email, senha } = req.body;
            const ip = req.ip || req.connection?.remoteAddress || "0.0.0.0";
            const userAgent = req.headers["user-agent"] || "";

            // Validar entrada
            if (!email || !senha) {
                return res.status(400).json({
                    status: false,
                    message: "Email e senha são obrigatórios"
                });
            }

            // Buscar usuário
            const resultado = await query(
                `SELECT id, nome_usuario, email, senha_hash, ativo 
                 FROM usuarios 
                 WHERE email = $1`,
                [email]
            );

            if (resultado.rows.length === 0) {
                return res.status(401).json({
                    status: false,
                    message: "Email ou senha inválidos"
                });
            }

            const usuario = resultado.rows[0];

            // Verificar se usuário está ativo
            if (!usuario.ativo) {
                return res.status(403).json({
                    status: false,
                    message: "Usuário desativado"
                });
            }

            // Verificar senha
            if (!compararSenha(senha, usuario.senha_hash)) {
                // Registrar tentativa falha
                await query(
                    `INSERT INTO logs_sistema (usuario_id, acao, descricao, ip) 
                     VALUES ($1, $2, $3, $4)`,
                    [usuario.id, "login_falha", "Tentativa de login com senha incorreta", ip]
                );

                return res.status(401).json({
                    status: false,
                    message: "Email ou senha inválidos"
                });
            }

            // Buscar perfil do usuário
            const perfilResult = await query(
                `SELECT up.perfil_id, p.nome, p.limite_usuarios_logados
                 FROM usuario_perfil up
                 JOIN perfis_acesso p ON up.perfil_id = p.id
                 WHERE up.usuario_id = $1 
                 AND up.ativo = TRUE 
                 AND (up.data_validade IS NULL OR up.data_validade > NOW())
                 ORDER BY up.data_inicio DESC
                 LIMIT 1`,
                [usuario.id]
            );

            let perfilNome = "Sem perfil";
            let perfilId = null;

            if (perfilResult.rows.length > 0) {
                const perfil = perfilResult.rows[0];
                perfilNome = perfil.nome;
                perfilId = perfil.perfil_id;

                // Verificar se perfil tem vaga
                const vagasResult = await query(
                    `SELECT COUNT(DISTINCT s.usuario_id) as logados
                     FROM sessoes s
                     WHERE s.perfil_id = $1 
                     AND s.ativo = TRUE 
                     AND s.data_expiracao > NOW()`,
                    [perfil.perfil_id]
                );

                const logados = parseInt(vagasResult.rows[0].logados);
                if (logados >= perfil.limite_usuarios_logados) {
                    return res.status(429).json({
                        status: false,
                        message: `Perfil "${perfil.nome}" está lotado. Limite: ${perfil.limite_usuarios_logados} usuário(s) logado(s) simultaneamente.`
                    });
                }
            }

            // Gerar token
            const token = gerarToken();
            const expiracao = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            // Usar transaction para login
            await transaction(async (client: PoolClient) => {
                // Desativar sessões antigas do usuário
                await client.query(
                    `UPDATE sessoes 
                     SET ativo = FALSE 
                     WHERE usuario_id = $1 AND ativo = TRUE`,
                    [usuario.id]
                );

                // Criar nova sessão (se tiver perfil)
                if (perfilId) {
                    await client.query(
                        `INSERT INTO sessoes (usuario_id, perfil_id, token, data_expiracao, ip, user_agent)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [usuario.id, perfilId, token, expiracao, ip, userAgent]
                    );

                    // Registrar histórico de login
                    await client.query(
                        `INSERT INTO historico_login (usuario_id, perfil_id, ip, user_agent)
                         VALUES ($1, $2, $3, $4)`,
                        [usuario.id, perfilId, ip, userAgent]
                    );
                }

                // Atualizar último login do usuário
                await client.query(
                    `UPDATE usuarios 
                     SET ultimo_login = NOW(), ultimo_ip = $1 
                     WHERE id = $2`,
                    [ip, usuario.id]
                );

                // Registrar log de sucesso
                await client.query(
                    `INSERT INTO logs_sistema (usuario_id, perfil_id, acao, descricao, ip)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [usuario.id, perfilId, "login", "Login realizado com sucesso", ip]
                );
            });

            return res.status(200).json({
                status: true,
                message: "Login realizado com sucesso",
                dados: {
                    usuario: {
                        id: usuario.id,
                        nome: usuario.nome_usuario,
                        email: usuario.email
                    },
                    perfil: perfilNome,
                    token: token,
                    expira_em: "7 dias"
                }
            });

        } catch (error) {
            console.error("❌ Erro no login:", error);
            return res.status(500).json({
                status: false,
                message: "Erro interno do servidor"
            });
        }
    }

    // ============================================
    // LOGOUT
    // ============================================
    async logout(req: Request, res: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1] || req.body.token;

            if (!token) {
                return res.status(400).json({
                    status: false,
                    message: "Token não fornecido"
                });
            }

            // Buscar sessão
            const sessaoResult = await query(
                `SELECT usuario_id, perfil_id, ip 
                 FROM sessoes 
                 WHERE token = $1 AND ativo = TRUE`,
                [token]
            );

            if (sessaoResult.rows.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Sessão não encontrada"
                });
            }

            const sessao = sessaoResult.rows[0];

            // Usar transaction para logout
            await transaction(async (client: PoolClient) => {
                // Desativar sessão
                await client.query(
                    `UPDATE sessoes 
                     SET ativo = FALSE 
                     WHERE token = $1`,
                    [token]
                );

                // Atualizar histórico de login
                await client.query(
                    `UPDATE historico_login 
                     SET data_logout = NOW(),
                         duracao_minutos = EXTRACT(EPOCH FROM (NOW() - data_login)) / 60
                     WHERE usuario_id = $1 
                     AND perfil_id = $2 
                     AND data_logout IS NULL 
                     ORDER BY data_login DESC 
                     LIMIT 1`,
                    [sessao.usuario_id, sessao.perfil_id]
                );

                // Registrar log
                await client.query(
                    `INSERT INTO logs_sistema (usuario_id, perfil_id, acao, descricao, ip)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [sessao.usuario_id, sessao.perfil_id, "logout", "Logout realizado", sessao.ip]
                );
            });

            return res.json({
                status: true,
                message: "Logout realizado com sucesso"
            });

        } catch (error) {
            console.error("❌ Erro no logout:", error);
            return res.status(500).json({
                status: false,
                message: "Erro ao fazer logout"
            });
        }
    }

    // ============================================
    // VALIDAR TOKEN
    // ============================================
    async validarToken(req: Request, res: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1] || req.body.token || req.query.token;

            if (!token) {
                return res.status(400).json({
                    status: false,
                    message: "Token não fornecido"
                });
            }

            const result = await query(
                `SELECT 
                    s.*,
                    u.nome_usuario,
                    u.email,
                    u.ativo AS usuario_ativo,
                    p.nome AS perfil_nome
                 FROM sessoes s
                 JOIN usuarios u ON s.usuario_id = u.id
                 LEFT JOIN perfis_acesso p ON s.perfil_id = p.id
                 WHERE s.token = $1 
                 AND s.ativo = TRUE 
                 AND s.data_expiracao > NOW()
                 AND u.ativo = TRUE`,
                [token]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    status: false,
                    valido: false,
                    message: "Token inválido ou expirado"
                });
            }

            const sessao = result.rows[0];

            return res.json({
                status: true,
                valido: true,
                dados: {
                    usuario: {
                        id: sessao.usuario_id,
                        nome: sessao.nome_usuario,
                        email: sessao.email,
                        perfil: sessao.perfil_nome || "Sem perfil"
                    },
                    expira_em: sessao.data_expiracao
                }
            });

        } catch (error) {
            console.error("❌ Erro ao validar token:", error);
            return res.status(500).json({
                status: false,
                message: "Erro ao validar token"
            });
        }
    }
}

// ============================================
// EXPORTAR INSTÂNCIA
// ============================================
export default new UserCadastroController();