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
            console.log(`🔑 Tipo da senha: ${typeof senha}`);
            console.log(`🔑 Tamanho da senha: ${senha?.length}`);
            console.log(`🌐 IP: ${ip}`);
            console.log("========================================");
            if (!email || !senha) {
                console.log("❌ Email ou senha vazios");
                return res.status(400).json({
                    status: false,
                    message: "Email e senha são obrigatórios"
                });
            }
            // Buscar usuário
            const resultado = await (0, connection_1.query)(`SELECT id, nome_usuario, email, senha_hash, ativo 
                 FROM usuarios 
                 WHERE email = $1`, [email.trim()]);
            console.log(`🔍 Usuários encontrados: ${resultado.rows.length}`);
            if (resultado.rows.length === 0) {
                console.log("❌ Usuário não encontrado");
                return res.status(401).json({
                    status: false,
                    message: "Email ou senha inválidos"
                });
            }
            const usuario = resultado.rows[0];
            console.log(`🔍 Usuário ID: ${usuario.id}`);
            console.log(`🔍 Nome: ${usuario.nome_usuario}`);
            console.log(`🔍 Ativo: ${usuario.ativo}`);
            console.log(`🔍 Hash no BANCO: "${usuario.senha_hash}"`);
            console.log(`🔍 Hash no BANCO (primeiros 20): ${usuario.senha_hash?.substring(0, 20)}...`);
            if (!usuario.ativo) {
                console.log("❌ Usuário desativado");
                return res.status(403).json({
                    status: false,
                    message: "Usuário desativado"
                });
            }
            // 🔴 CALCULAR O HASH DA SENHA DIGITADA
            const senhaDigitadaHash = (0, crypto_1.sha256)(senha);
            console.log(`🔍 Hash CALCULADO (senha digitada): "${senhaDigitadaHash}"`);
            console.log(`🔍 Hash CALCULADO (primeiros 20): ${senhaDigitadaHash.substring(0, 20)}...`);
            console.log(`🔍 Hash no BANCO:               "${usuario.senha_hash}"`);
            console.log(`🔍 Comparação: ${senhaDigitadaHash === usuario.senha_hash ? '✅ IGUAIS' : '❌ DIFERENTES'}`);
            // 🔴 COMPARAÇÃO CARACTERE POR CARACTERE SE FOR DIFERENTE
            if (senhaDigitadaHash !== usuario.senha_hash) {
                console.log("🔍 COMPARAÇÃO DETALHADA:");
                console.log(`  Tamanho hash digitado: ${senhaDigitadaHash.length}`);
                console.log(`  Tamanho hash banco:    ${usuario.senha_hash?.length}`);
                // Mostrar onde está a diferença
                const minLength = Math.min(senhaDigitadaHash.length, usuario.senha_hash?.length || 0);
                for (let i = 0; i < minLength; i++) {
                    if (senhaDigitadaHash[i] !== usuario.senha_hash[i]) {
                        console.log(`  ❌ Diferença na posição ${i}: '${senhaDigitadaHash[i]}' vs '${usuario.senha_hash[i]}'`);
                        break;
                    }
                }
                if (senhaDigitadaHash.length !== usuario.senha_hash?.length) {
                    console.log(`  ❌ Tamanhos diferentes: ${senhaDigitadaHash.length} vs ${usuario.senha_hash?.length}`);
                }
            }
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
            // Buscar perfil do usuário
            const perfilResult = await (0, connection_1.query)(`SELECT up.perfil_id, p.nome, p.limite_usuarios_logados
                 FROM usuario_perfil up
                 JOIN perfis_acesso p ON up.perfil_id = p.id
                 WHERE up.usuario_id = $1 
                 AND up.ativo = TRUE 
                 AND (up.data_validade IS NULL OR up.data_validade > NOW())
                 ORDER BY up.data_inicio DESC
                 LIMIT 1`, [usuario.id]);
            let perfilNome = "Sem perfil";
            let perfilId = null;
            console.log(`🔍 Perfis encontrados: ${perfilResult.rows.length}`);
            if (perfilResult.rows.length > 0) {
                const perfil = perfilResult.rows[0];
                perfilNome = perfil.nome;
                perfilId = perfil.perfil_id;
                console.log(`🔍 Perfil: ${perfilNome}`);
                const vagasResult = await (0, connection_1.query)(`SELECT COUNT(DISTINCT s.usuario_id) as logados
                     FROM sessoes s
                     WHERE s.perfil_id = $1 
                     AND s.ativo = TRUE 
                     AND s.data_expiracao > NOW()`, [perfil.perfil_id]);
                const logados = parseInt(vagasResult.rows[0].logados);
                console.log(`🔍 Logados no perfil: ${logados}/${perfil.limite_usuarios_logados}`);
                if (logados >= perfil.limite_usuarios_logados) {
                    console.log("❌ Perfil lotado");
                    return res.status(429).json({
                        status: false,
                        message: `Perfil "${perfil.nome}" está lotado. Limite: ${perfil.limite_usuarios_logados} usuário(s) logado(s) simultaneamente.`
                    });
                }
            }
            else {
                console.log("⚠️ Usuário sem perfil ativo - continuando sem perfil");
            }
            // Gerar token
            const token = (0, crypto_1.gerarToken)();
            const expiracao = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            console.log(`🔑 Token gerado: ${token.substring(0, 20)}...`);
            await (0, connection_1.transaction)(async (client) => {
                await client.query(`UPDATE sessoes 
                     SET ativo = FALSE 
                     WHERE usuario_id = $1 AND ativo = TRUE`, [usuario.id]);
                if (perfilId) {
                    await client.query(`INSERT INTO sessoes (usuario_id, perfil_id, token, data_expiracao, ip, user_agent)
                         VALUES ($1, $2, $3, $4, $5, $6)`, [usuario.id, perfilId, token, expiracao, ip, userAgent]);
                    await client.query(`INSERT INTO historico_login (usuario_id, perfil_id, ip, user_agent)
                         VALUES ($1, $2, $3, $4)`, [usuario.id, perfilId, ip, userAgent]);
                }
                // Use apenas:
                await client.query(`UPDATE usuarios 
                    SET ultimo_login = NOW()
                    WHERE id = $1`, [usuario.id]);
                await client.query(`INSERT INTO logs_sistema (usuario_id, perfil_id, acao, descricao, ip)
                     VALUES ($1, $2, $3, $4, $5)`, [usuario.id, perfilId, "login", "Login realizado com sucesso", ip]);
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
                    perfil: perfilNome,
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
    async logout(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1] || req.body.token;
            if (!token) {
                return res.status(400).json({
                    status: false,
                    message: "Token não fornecido"
                });
            }
            const sessaoResult = await (0, connection_1.query)(`SELECT usuario_id, perfil_id, ip 
             FROM sessoes 
             WHERE token = $1 AND ativo = TRUE`, [token]);
            if (sessaoResult.rows.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Sessão não encontrada"
                });
            }
            const sessao = sessaoResult.rows[0];
            await (0, connection_1.transaction)(async (client) => {
                // Desativar sessão
                await client.query(`UPDATE sessoes 
                 SET ativo = FALSE 
                 WHERE token = $1`, [token]);
                // ✅ CORRIGIDO: Removido ORDER BY do UPDATE
                await client.query(`UPDATE historico_login 
                 SET data_logout = NOW(),
                     duracao_minutos = EXTRACT(EPOCH FROM (NOW() - data_login)) / 60
                 WHERE usuario_id = $1 
                 AND perfil_id = $2 
                 AND data_logout IS NULL`, [sessao.usuario_id, sessao.perfil_id]);
                // Registrar log
                await client.query(`INSERT INTO logs_sistema (usuario_id, perfil_id, acao, descricao, ip)
                 VALUES ($1, $2, $3, $4, $5)`, [sessao.usuario_id, sessao.perfil_id, "logout", "Logout realizado", sessao.ip]);
            });
            return res.json({
                status: true,
                message: "Logout realizado com sucesso"
            });
        }
        catch (error) {
            console.error("Erro no logout:", error);
            return res.status(500).json({
                status: false,
                message: "Erro ao fazer logout"
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