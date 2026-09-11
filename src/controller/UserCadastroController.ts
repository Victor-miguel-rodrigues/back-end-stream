import { Request, Response } from "express";
import { PoolClient } from "pg";
import { query, transaction } from "../database/connection";
import { sha256, gerarToken, compararSenha } from "../utils/crypto";


// ============================================
// CONTROLLER UNIFICADO
// ============================================
export class UserCadastroController {
    listar(_req: any, res: any) {
        return res.json({
            mensage: "Funcionando direitinho",
            status: true,
            dados: [],
        });
    }

    // ============================================
    // CADASTRAR USUÁRIO (COM CRIPTOGRAFIA)
    // ============================================
    async receber(req: Request, res: Response) {
        try {
            const { nome_usuario, email, senha, perfil, pago } = req.body;

            console.log("========================================");
            console.log("📝 CADASTRO - Recebido:");
            console.log(`  Nome: "${nome_usuario}"`);
            console.log(`  Email: "${email}"`);
            console.log(`  Senha: "***"`);
            console.log(`  Perfil: "${perfil || 'Premium'}"`);
            console.log(`  Pago: ${pago || false}`);
            console.log("========================================");

            if (!nome_usuario || !email || !senha) {
                return res.status(400).json({
                    status: false,
                    message: "Nome, email e senha são obrigatórios"
                });
            }

            const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailValido.test(email)) {
                return res.status(400).json({
                    status: false,
                    message: "Email inválido"
                });
            }

            if (senha.length < 6) {
                return res.status(400).json({
                    status: false,
                    message: "Senha deve ter pelo menos 6 caracteres"
                });
            }

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

            const senhaHash = sha256(senha);
            console.log(`🔐 Hash gerado para cadastro: ${senhaHash}`);

            const resultado = await transaction(async (client: PoolClient) => {
                const insertResult = await client.query(
                    `INSERT INTO usuarios (nome_usuario, email, senha_hash, pago) 
                     VALUES ($1, $2, $3, $4) 
                     RETURNING id, nome_usuario, email, data_cadastro`,
                    [nome_usuario.trim(), email.trim(), senhaHash, pago || false]
                );

                console.log("✅ Usuário criado:", {
                    id: insertResult.rows[0].id,
                    nome: insertResult.rows[0].nome_usuario,
                    email: insertResult.rows[0].email,
                    pago: pago || false
                });

                if (perfil) {
                    const perfilResult = await client.query(
                        `SELECT id FROM perfis_acesso WHERE nome = $1`,
                        [perfil]
                    );

                    if (perfilResult.rows.length > 0) {
                        await client.query(
                            `INSERT INTO usuario_perfil (usuario_id, perfil_id, data_validade, ativo)
                             VALUES ($1, $2, NOW() + INTERVAL '30 days', true)`,
                            [insertResult.rows[0].id, perfilResult.rows[0].id]
                        );
                    }
                }

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
    // LOGIN (COM VERIFICAÇÃO DE PAGAMENTO E DATA_VALIDADE)
    // ============================================
    async logar(req: Request, res: Response) {
        try {
            const { email, senha } = req.body;
            const ip = req.ip || req.connection?.remoteAddress || "0.0.0.0";
            const userAgent = req.headers["user-agent"] || "";

            console.log("========================================");
            console.log("🔍 LOGIN - Iniciando");
            console.log(`📧 Email RECEBIDO: "${email}"`);
            console.log(`🔑 Senha RECEBIDA: "${senha}"`);
            console.log(`🌐 IP: ${ip}`);
            console.log("========================================");

            if (!email || !senha) {
                console.log("❌ Email ou senha vazios");
                return res.status(400).json({
                    status: false,
                    message: "Email e senha são obrigatórios"
                });
            }

            // 1. Buscar usuário
            const resultado = await query(
                `SELECT id, nome_usuario, email, senha_hash, ativo, pago 
                 FROM usuarios 
                 WHERE email = $1`,
                [email.trim()]
            );

            if (resultado.rows.length === 0) {
                console.log("❌ Usuário não encontrado");
                return res.status(401).json({
                    status: false,
                    message: "Email ou senha inválidos"
                });
            }

            const usuario = resultado.rows[0];

            if (!usuario.ativo) {
                console.log("❌ Usuário desativado");
                return res.status(403).json({
                    status: false,
                    message: "Usuário desativado"
                });
            }

            // 2. VERIFICAR SE O USUÁRIO ESTÁ PAGO
            if (!usuario.pago) {
                console.log("❌ Usuário não pago");
                await query(
                    `INSERT INTO logs_sistema (usuario_id, acao, descricao, ip) 
                     VALUES ($1, $2, $3, $4)`,
                    [usuario.id, "login_bloqueado", "Tentativa de login com pagamento pendente", ip]
                );
                return res.status(402).json({
                    status: false,
                    message: "⚠️ Acesso bloqueado! Pagamento pendente.",
                    codigo: "PAGAMENTO_PENDENTE",
                    acao: "Entre em contato com o suporte para regularizar seu pagamento."
                });
            }

            // 3. Verificar senha
            if (!compararSenha(senha, usuario.senha_hash)) {
                console.log("❌ Senha incorreta");
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

            console.log("✅ Senha correta!");

            // 4. 🔴 BUSCAR PERFIL VÁLIDO (BLOQUEIA SE DATA_VALIDADE JÁ PASSOU)
            const perfilResult = await query(
                `SELECT up.perfil_id, p.nome, up.data_validade
                 FROM usuario_perfil up
                 JOIN perfis_acesso p ON up.perfil_id = p.id
                 WHERE up.usuario_id = $1 
                   AND up.ativo = TRUE 
                   AND (up.data_validade IS NULL OR up.data_validade > NOW())
                 ORDER BY 
                   up.data_validade NULLS LAST,
                   up.data_inicio DESC
                 LIMIT 1`,
                [usuario.id]
            );

            // 🔴 Se não achou perfil válido, pode ser que exista mas expirou
            if (perfilResult.rows.length === 0) {
                console.log("❌ Usuário sem perfil válido (expirado ou inexistente)");

                // Verifica se ele TEM perfil mas expirou, pra dar mensagem mais clara
                const expiradoResult = await query(
                    `SELECT up.data_validade, p.nome
                     FROM usuario_perfil up
                     JOIN perfis_acesso p ON up.perfil_id = p.id
                     WHERE up.usuario_id = $1 
                       AND up.ativo = TRUE
                     ORDER BY up.data_inicio DESC
                     LIMIT 1`,
                    [usuario.id]
                );

                if (expiradoResult.rows.length > 0) {
                    const expirado = expiradoResult.rows[0];
                    console.log(`❌ Perfil "${expirado.nome}" expirou em ${expirado.data_validade}`);

                    await query(
                        `INSERT INTO logs_sistema (usuario_id, acao, descricao, ip) 
                         VALUES ($1, $2, $3, $4)`,
                        [usuario.id, "login_perfil_expirado", `Perfil expirado em ${expirado.data_validade}`, ip]
                    );

                    return res.status(403).json({
                        status: false,
                        message: "Seu acesso expirou. Renove para continuar.",
                        codigo: "PERFIL_EXPIRADO",
                        expirou_em: expirado.data_validade
                    });
                }

                return res.status(403).json({
                    status: false,
                    message: "Usuário não possui perfil ativo"
                });
            }

            const perfil = perfilResult.rows[0];
            const dataValidade = perfil.data_validade || null;

            // 5. VERIFICAR SE É PREMIUM
            if (perfil.nome !== 'Premium' && perfil.nome !== 'Empresarial') {
                console.log(`❌ Usuário com perfil "${perfil.nome}" não pode logar (apenas Premium)`);
                return res.status(403).json({
                    status: false,
                    message: "Apenas usuários Premium podem acessar o sistema"
                });
            }

            // 6. VERIFICAR SE O USUÁRIO JÁ ESTÁ LOGADO EM OUTRO LUGAR
            const sessaoExistente = await query(
                `SELECT id, ip, data_criacao 
                 FROM sessoes 
                 WHERE usuario_id = $1 
                 AND ativo = TRUE 
                 AND data_expiracao > NOW()`,
                [usuario.id]
            );

            if (sessaoExistente.rows.length > 0) {
                const sessao = sessaoExistente.rows[0];
                console.log(`❌ Usuário já está logado em outro dispositivo!`);
                console.log(`   IP: ${sessao.ip}`);
                console.log(`   Desde: ${sessao.data_criacao}`);
                
                return res.status(409).json({
                    status: false,
                    message: `Usuário já está logado em outro dispositivo. Faça logout antes de tentar novamente.`,
                    detalhes: {
                        ip: sessao.ip,
                        logado_desde: sessao.data_criacao
                    }
                });
            }

            // 7. Gerar token e criar sessão
            const token = gerarToken();
            const expiracao = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            await transaction(async (client: PoolClient) => {
                await client.query(
                    `INSERT INTO sessoes (usuario_id, perfil_id, token, data_expiracao, ip, user_agent)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [usuario.id, perfil.perfil_id, token, expiracao, ip, userAgent]
                );

                await client.query(
                    `INSERT INTO historico_login (usuario_id, perfil_id, ip, user_agent)
                     VALUES ($1, $2, $3, $4)`,
                    [usuario.id, perfil.perfil_id, ip, userAgent]
                );

                await client.query(
                    `UPDATE usuarios 
                    SET ultimo_login = NOW()
                    WHERE id = $1`,
                    [usuario.id]
                );

                await client.query(
                    `INSERT INTO logs_sistema (usuario_id, perfil_id, acao, descricao, ip)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [usuario.id, perfil.perfil_id, "login", "Login realizado com sucesso", ip]
                );
            });

            console.log("✅ Login realizado com sucesso!");
            console.log("========================================");

            // 8. 🔴 RETORNAR COM DATA_VALIDADE
            return res.status(200).json({
                status: true,
                message: "Login realizado com sucesso",
                dados: {
                    usuario: {
                        id: usuario.id,
                        nome: usuario.nome_usuario,
                        email: usuario.email
                    },
                    perfil: perfil.nome,
                    token: token,
                    expira_em: "7 dias",
                    data_validade: dataValidade
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

            console.log("========================================");
            console.log("🔍 LOGOUT - Iniciando");
            console.log(`🔑 Token: ${token ? token.substring(0, 20) + "..." : "não fornecido"}`);
            console.log("========================================");

            if (!token) {
                return res.status(400).json({
                    status: false,
                    message: "Token não fornecido"
                });
            }

            const sessaoResult = await query(
                `SELECT usuario_id, perfil_id, ip, data_criacao
                 FROM sessoes 
                 WHERE token = $1 AND ativo = TRUE`,
                [token]
            );

            console.log(`🔍 Sessão encontrada: ${sessaoResult.rows.length > 0 ? '✅ SIM' : '❌ NÃO'}`);

            if (sessaoResult.rows.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Sessão não encontrada"
                });
            }

            const sessao = sessaoResult.rows[0];

            await transaction(async (client: PoolClient) => {
                await client.query(
                    `UPDATE sessoes 
                     SET ativo = FALSE 
                     WHERE token = $1`,
                    [token]
                );

                await client.query(
                    `UPDATE historico_login 
                     SET data_logout = NOW(),
                         duracao_minutos = EXTRACT(EPOCH FROM (NOW() - data_login)) / 60
                     WHERE usuario_id = $1 
                     AND perfil_id = $2 
                     AND data_logout IS NULL`,
                    [sessao.usuario_id, sessao.perfil_id]
                );

                await client.query(
                    `INSERT INTO logs_sistema (usuario_id, perfil_id, acao, descricao, ip)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [sessao.usuario_id, sessao.perfil_id, "logout", "Logout realizado", sessao.ip]
                );
            });

            console.log("✅ Logout realizado com sucesso!");
            console.log("========================================");

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
    // VERIFICAR PAGAMENTO
    // ============================================
    async checkPagamento(req: Request, res: Response) {
        try {
            const { email } = req.query;

            if (!email) {
                return res.status(400).json({
                    status: false,
                    message: "Email é obrigatório"
                });
            }

            const result = await query(
                `SELECT pago FROM usuarios WHERE email = $1`,
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Usuário não encontrado"
                });
            }

            return res.json({
                status: true,
                pago: result.rows[0].pago || false
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "Erro ao verificar pagamento"
            });
        }
    }

    // ============================================
    // VALIDAR TOKEN (AGORA CHECA TAMBÉM data_validade DO PERFIL)
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
                    p.nome AS perfil_nome,
                    up.data_validade AS perfil_validade
                 FROM sessoes s
                 JOIN usuarios u ON s.usuario_id = u.id
                 LEFT JOIN perfis_acesso p ON s.perfil_id = p.id
                 LEFT JOIN usuario_perfil up 
                    ON up.usuario_id = s.usuario_id 
                   AND up.perfil_id = s.perfil_id
                 WHERE s.token = $1 
                   AND s.ativo = TRUE 
                   AND s.data_expiracao > NOW()
                   AND u.ativo = TRUE
                   AND (up.data_validade IS NULL OR up.data_validade > NOW())`,
                [token]
            );

            if (result.rows.length === 0) {
                // Verifica se era caso de perfil expirado, pra dar mensagem específica
                const existeToken = await query(
                    `SELECT s.id, up.data_validade, p.nome AS perfil_nome
                     FROM sessoes s
                     LEFT JOIN usuario_perfil up 
                        ON up.usuario_id = s.usuario_id 
                       AND up.perfil_id = s.perfil_id
                     LEFT JOIN perfis_acesso p ON up.perfil_id = p.id
                     WHERE s.token = $1 AND s.ativo = TRUE`,
                    [token]
                );

                if (existeToken.rows.length > 0 && existeToken.rows[0].data_validade) {
                    const val = existeToken.rows[0].data_validade;
                    if (new Date(val) <= new Date()) {
                        return res.status(401).json({
                            status: false,
                            valido: false,
                            codigo: "PERFIL_EXPIRADO",
                            message: "Seu acesso expirou. Renove para continuar.",
                            expirou_em: val
                        });
                    }
                }

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
                    expira_em: sessao.data_expiracao,
                    perfil_validade: sessao.perfil_validade
                }
            });

        } catch (error) {
            console.error("Erro ao validar token:", error);
            return res.status(500).json({
                status: false,
                message: "Erro ao validar token"
            });
        }
    }

    // ============================================
    // LISTAR FAVORITOS DO USUÁRIO
    // ============================================
    async listarFavoritos(req: Request, res: Response) {
        try {
            const usuarioId = (req as any).usuario?.id;
            
            if (!usuarioId) {
                return res.status(401).json({
                    status: false,
                    message: 'Usuário não autenticado'
                });
            }

            const result = await query(
                `SELECT item_id, item_nome, item_tipo, data_adicao 
                 FROM favoritos_usuarios 
                 WHERE usuario_id = $1 
                 ORDER BY data_adicao DESC`,
                [usuarioId]
            );

            return res.json({
                status: true,
                dados: result.rows
            });

        } catch (error) {
            console.error('Erro ao listar favoritos:', error);
            return res.status(500).json({
                status: false,
                message: 'Erro ao listar favoritos'
            });
        }
    }

    // ============================================
    // ADICIONAR FAVORITO
    // ============================================
    async adicionarFavorito(req: Request, res: Response) {
        try {
            const usuarioId = (req as any).usuario?.id;
            const { item_id, item_nome, item_tipo } = req.body;

            if (!usuarioId) {
                return res.status(401).json({
                    status: false,
                    message: 'Usuário não autenticado'
                });
            }

            if (!item_id || !item_nome || !item_tipo) {
                return res.status(400).json({
                    status: false,
                    message: 'item_id, item_nome e item_tipo são obrigatórios'
                });
            }

            const existente = await query(
                `SELECT id FROM favoritos_usuarios 
                 WHERE usuario_id = $1 AND item_id = $2`,
                [usuarioId, item_id]
            );

            if (existente.rows.length > 0) {
                return res.status(409).json({
                    status: false,
                    message: 'Item já está nos favoritos'
                });
            }

            const result = await query(
                `INSERT INTO favoritos_usuarios (usuario_id, item_id, item_nome, item_tipo)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, item_id, item_nome, item_tipo, data_adicao`,
                [usuarioId, item_id, item_nome, item_tipo]
            );

            return res.status(201).json({
                status: true,
                message: 'Favorito adicionado com sucesso',
                dados: result.rows[0]
            });

        } catch (error) {
            console.error('Erro ao adicionar favorito:', error);
            return res.status(500).json({
                status: false,
                message: 'Erro ao adicionar favorito'
            });
        }
    }

    // ============================================
    // REMOVER FAVORITO
    // ============================================
    async removerFavorito(req: Request, res: Response) {
        try {
            const usuarioId = (req as any).usuario?.id;
            const { item_id } = req.params;

            if (!usuarioId) {
                return res.status(401).json({
                    status: false,
                    message: 'Usuário não autenticado'
                });
            }

            const result = await query(
                `DELETE FROM favoritos_usuarios 
                 WHERE usuario_id = $1 AND item_id = $2
                 RETURNING id`,
                [usuarioId, item_id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: 'Favorito não encontrado'
                });
            }

            return res.json({
                status: true,
                message: 'Favorito removido com sucesso'
            });

        } catch (error) {
            console.error('Erro ao remover favorito:', error);
            return res.status(500).json({
                status: false,
                message: 'Erro ao remover favorito'
            });
        }
    }
}

export default new UserCadastroController();