"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCadastroController = void 0;
const connection_1 = require("../database/connection");
const crypto_1 = require("../utils/crypto");
// ============================================
// CONTROLLER UNIFICADO
// ============================================
class UserCadastroController {
    listar(_req, res) {
        return res.json({
            mensage: "Funcionado direitinho",
            status: true,
            dados: [],
        });
    }
    // ============================================
    // CADASTRAR USUÁRIO (COM CRIPTOGRAFIA)
    // ============================================
    async receber(req, res) {
        try {
            const { nome_usuario, email, senha } = req.body;
            console.log("========================================");
            console.log("📝 CADASTRO - Recebido:");
            console.log(`  Nome: "${nome_usuario}"`);
            console.log(`  Email: "${email}"`);
            console.log(`  Senha: "***"`);
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
            const existeResult = await (0, connection_1.query)("SELECT id FROM usuarios WHERE email = $1", [email]);
            if (existeResult.rows.length > 0) {
                return res.status(409).json({
                    status: false,
                    message: "Email já cadastrado"
                });
            }
            const senhaHash = (0, crypto_1.sha256)(senha);
            console.log(`🔐 Hash gerado para cadastro: ${senhaHash}`);
            const resultado = await (0, connection_1.transaction)(async (client) => {
                const insertResult = await client.query(`INSERT INTO usuarios (nome_usuario, email, senha_hash) 
                     VALUES ($1, $2, $3) 
                     RETURNING id, nome_usuario, email, data_cadastro`, [nome_usuario.trim(), email.trim(), senhaHash]);
                console.log("✅ Usuário criado:", {
                    id: insertResult.rows[0].id,
                    nome: insertResult.rows[0].nome_usuario,
                    email: insertResult.rows[0].email,
                    senha_hash: senhaHash.substring(0, 20) + "..."
                });
                await client.query(`INSERT INTO logs_sistema (usuario_id, acao, descricao, ip)
                     VALUES ($1, $2, $3, $4)`, [insertResult.rows[0].id, "cadastro", "Novo usuário cadastrado", req.ip || "0.0.0.0"]);
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
        }
        catch (error) {
            console.error("❌ Erro ao cadastrar usuário:", error);
            return res.status(500).json({
                status: false,
                message: "Erro ao cadastrar usuário"
            });
        }
    }
    // ============================================
    // LOGIN (COM TOKEN E SESSÃO) - COM LOGS DETALHADOS
    // ============================================
    async logar(req, res) {
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
            const resultado = await (0, connection_1.query)(`SELECT id, nome_usuario, email, senha_hash, ativo 
             FROM usuarios 
             WHERE email = $1`, [email.trim()]);
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
            // 2. Verificar senha
            if (!(0, crypto_1.compararSenha)(senha, usuario.senha_hash)) {
                console.log("❌ Senha incorreta");
                await (0, connection_1.query)(`INSERT INTO logs_sistema (usuario_id, acao, descricao, ip) 
                 VALUES ($1, $2, $3, $4)`, [usuario.id, "login_falha", "Tentativa de login com senha incorreta", ip]);
                return res.status(401).json({
                    status: false,
                    message: "Email ou senha inválidos"
                });
            }
            console.log("✅ Senha correta!");
            // 3. Buscar perfil do usuário
            const perfilResult = await (0, connection_1.query)(`SELECT up.perfil_id, p.nome
             FROM usuario_perfil up
             JOIN perfis_acesso p ON up.perfil_id = p.id
             WHERE up.usuario_id = $1 
             AND up.ativo = TRUE 
             AND (up.data_validade IS NULL OR up.data_validade > NOW())
             ORDER BY up.data_inicio DESC
             LIMIT 1`, [usuario.id]);
            if (perfilResult.rows.length === 0) {
                return res.status(403).json({
                    status: false,
                    message: "Usuário não possui perfil ativo"
                });
            }
            const perfil = perfilResult.rows[0];
            // 4. 🔴 VERIFICAR SE É PREMIUM
            if (perfil.nome !== 'Premium' && perfil.nome !== 'Empresarial') {
                console.log(`❌ Usuário com perfil "${perfil.nome}" não pode logar (apenas Premium)`);
                return res.status(403).json({
                    status: false,
                    message: "Apenas usuários Premium podem acessar o sistema"
                });
            }
            // 5. 🔴 VERIFICAR SE O USUÁRIO JÁ ESTÁ LOGADO EM OUTRO LUGAR
            const sessaoExistente = await (0, connection_1.query)(`SELECT id, ip, data_criacao 
             FROM sessoes 
             WHERE usuario_id = $1 
             AND ativo = TRUE 
             AND data_expiracao > NOW()`, [usuario.id]);
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
            // 6. Gerar token e criar sessão
            const token = (0, crypto_1.gerarToken)();
            const expiracao = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await (0, connection_1.transaction)(async (client) => {
                await client.query(`INSERT INTO sessoes (usuario_id, perfil_id, token, data_expiracao, ip, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6)`, [usuario.id, perfil.perfil_id, token, expiracao, ip, userAgent]);
                await client.query(`INSERT INTO historico_login (usuario_id, perfil_id, ip, user_agent)
                 VALUES ($1, $2, $3, $4)`, [usuario.id, perfil.perfil_id, ip, userAgent]);
                await client.query(`UPDATE usuarios 
                SET ultimo_login = NOW()
                WHERE id = $1`, [usuario.id]);
                await client.query(`INSERT INTO logs_sistema (usuario_id, perfil_id, acao, descricao, ip)
                 VALUES ($1, $2, $3, $4, $5)`, [usuario.id, perfil.perfil_id, "login", "Login realizado com sucesso", ip]);
            });
            console.log("✅ Login realizado com sucesso!");
            console.log("========================================");
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
                    expira_em: "7 dias"
                }
            });
        }
        catch (error) {
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
    // ============================================
    // LOGOUT - CORRIGIDO
    // ============================================
    async logout(req, res) {
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
            // Buscar sessão
            const sessaoResult = await (0, connection_1.query)(`SELECT usuario_id, perfil_id, ip, data_criacao
             FROM sessoes 
             WHERE token = $1 AND ativo = TRUE`, [token]);
            console.log(`🔍 Sessão encontrada: ${sessaoResult.rows.length > 0 ? '✅ SIM' : '❌ NÃO'}`);
            if (sessaoResult.rows.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Sessão não encontrada"
                });
            }
            const sessao = sessaoResult.rows[0];
            await (0, connection_1.transaction)(async (client) => {
                // 1. Desativar sessão
                console.log("🔍 Desativando sessão...");
                await client.query(`UPDATE sessoes 
                 SET ativo = FALSE 
                 WHERE token = $1`, [token]);
                // 2. ✅ CORRIGIDO: Remover ORDER BY do UPDATE
                console.log("🔍 Atualizando histórico...");
                await client.query(`UPDATE historico_login 
                 SET data_logout = NOW(),
                     duracao_minutos = EXTRACT(EPOCH FROM (NOW() - data_login)) / 60
                 WHERE usuario_id = $1 
                 AND perfil_id = $2 
                 AND data_logout IS NULL`, [sessao.usuario_id, sessao.perfil_id]);
                // 3. Registrar log
                console.log("🔍 Registrando log...");
                await client.query(`INSERT INTO logs_sistema (usuario_id, perfil_id, acao, descricao, ip)
                 VALUES ($1, $2, $3, $4, $5)`, [sessao.usuario_id, sessao.perfil_id, "logout", "Logout realizado", sessao.ip]);
            });
            console.log("✅ Logout realizado com sucesso!");
            console.log("========================================");
            return res.json({
                status: true,
                message: "Logout realizado com sucesso"
            });
        }
        catch (error) {
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
    async checkPagamento(req, res) {
        try {
            const { email } = req.query;
            if (!email) {
                return res.status(400).json({
                    status: false,
                    message: "Email é obrigatório"
                });
            }
            const result = await (0, connection_1.query)(`SELECT pago FROM usuarios WHERE email = $1`, [email]);
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
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: "Erro ao verificar pagamento"
            });
        }
    }
    // ============================================
    // VALIDAR TOKEN
    // ============================================
    async validarToken(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1] || req.body.token || req.query.token;
            if (!token) {
                return res.status(400).json({
                    status: false,
                    message: "Token não fornecido"
                });
            }
            const result = await (0, connection_1.query)(`SELECT 
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
                 AND u.ativo = TRUE`, [token]);
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
        }
        catch (error) {
            console.error("Erro ao validar token:", error);
            return res.status(500).json({
                status: false,
                message: "Erro ao validar token"
            });
        }
    }
}
exports.UserCadastroController = UserCadastroController;
exports.default = new UserCadastroController();
//# sourceMappingURL=UserCadastroController.js.map