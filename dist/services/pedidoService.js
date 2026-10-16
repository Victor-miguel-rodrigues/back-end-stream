"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.excluirPedido = exports.atualizarStatusPedido = exports.listarPedidos = exports.criarPedido = exports.validarPedido = exports.STATUS_PEDIDO = void 0;
const connection_1 = require("../database/connection");
exports.STATUS_PEDIDO = ['pendente', 'pagamento_enviado', 'pago', 'login_enviado', 'cancelado'];
const RE_USUARIO = /^[a-z0-9._-]{3,20}$/;
const RE_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
// Lista de caracteres permitidos (nada de aspas, ponto e virgula, espacos...). Devolve null se invalido.
const validarPedido = (body) => {
    const usuario = typeof body?.usuario === 'string' ? body.usuario.trim().toLowerCase() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const origem = body?.origem === 'app' ? 'app' : 'site';
    if (!RE_USUARIO.test(usuario))
        return null;
    if (email.length > 120 || !RE_EMAIL.test(email))
        return null;
    return { usuario, email, origem };
};
exports.validarPedido = validarPedido;
// Sempre parametrizado ($1, $2...): o texto digitado nunca vira parte do SQL.
const criarPedido = async (p, ip) => {
    const r = await (0, connection_1.query)(`INSERT INTO pedidos (usuario, email, origem, ip)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING id`, [p.usuario, p.email, p.origem, ip.slice(0, 64)]);
    return (r.rowCount ?? 0) > 0 ? 'CRIADO' : 'DUPLICADO';
};
exports.criarPedido = criarPedido;
const listarPedidos = async (status, limite, pagina) => {
    const filtro = status && exports.STATUS_PEDIDO.includes(status) ? status : null;
    const lim = Math.min(Math.max(Number(limite) || 50, 1), 200);
    const off = (Math.max(Number(pagina) || 1, 1) - 1) * lim;
    const total = await (0, connection_1.query)(`SELECT COUNT(*) AS total FROM pedidos WHERE ($1::text IS NULL OR status = $1)`, [filtro]);
    const itens = await (0, connection_1.query)(`SELECT id, usuario, email, plano, valor, periodo, origem, status, criado_em, atualizado_em
           FROM pedidos
          WHERE ($1::text IS NULL OR status = $1)
          ORDER BY criado_em DESC
          LIMIT $2 OFFSET $3`, [filtro, lim, off]);
    return { total: Number(total.rows[0]?.total ?? 0), pagina: Math.floor(off / lim) + 1, limite: lim, itens: itens.rows };
};
exports.listarPedidos = listarPedidos;
const atualizarStatusPedido = async (id, status) => {
    if (!exports.STATUS_PEDIDO.includes(status))
        return null;
    const r = await (0, connection_1.query)(`UPDATE pedidos SET status = $1, atualizado_em = NOW() WHERE id = $2 RETURNING id, status`, [status, id]);
    return r.rows[0] ?? null;
};
exports.atualizarStatusPedido = atualizarStatusPedido;
const excluirPedido = async (id) => {
    const r = await (0, connection_1.query)(`DELETE FROM pedidos WHERE id = $1`, [id]);
    return (r.rowCount ?? 0) > 0;
};
exports.excluirPedido = excluirPedido;
//# sourceMappingURL=pedidoService.js.map