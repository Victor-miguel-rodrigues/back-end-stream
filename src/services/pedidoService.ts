import { query } from '../database/connection';

export const STATUS_PEDIDO = ['pendente', 'pagamento_enviado', 'pago', 'login_enviado', 'cancelado'] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];

const RE_USUARIO = /^[a-z0-9._-]{3,20}$/;
const RE_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export interface PedidoValido {
    usuario: string;
    email: string;
    origem: 'site' | 'app';
}

// Lista de caracteres permitidos (nada de aspas, ponto e virgula, espacos...). Devolve null se invalido.
export const validarPedido = (body: any): PedidoValido | null => {
    const usuario = typeof body?.usuario === 'string' ? body.usuario.trim().toLowerCase() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const origem = body?.origem === 'app' ? 'app' : 'site';
    if (!RE_USUARIO.test(usuario)) return null;
    if (email.length > 120 || !RE_EMAIL.test(email)) return null;
    return { usuario, email, origem };
};

// Sempre parametrizado ($1, $2...): o texto digitado nunca vira parte do SQL.
export const criarPedido = async (p: PedidoValido, ip: string): Promise<'CRIADO' | 'DUPLICADO'> => {
    const r = await query(
        `INSERT INTO pedidos (usuario, email, origem, ip)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [p.usuario, p.email, p.origem, ip.slice(0, 64)]
    );
    return (r.rowCount ?? 0) > 0 ? 'CRIADO' : 'DUPLICADO';
};

export const listarPedidos = async (status: string | null, limite: number, pagina: number) => {
    const filtro = status && (STATUS_PEDIDO as readonly string[]).includes(status) ? status : null;
    const lim = Math.min(Math.max(Number(limite) || 50, 1), 200);
    const off = (Math.max(Number(pagina) || 1, 1) - 1) * lim;
    const total = await query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM pedidos WHERE ($1::text IS NULL OR status = $1)`,
        [filtro]
    );
    const itens = await query(
        `SELECT id, usuario, email, plano, valor, periodo, origem, status, criado_em, atualizado_em
           FROM pedidos
          WHERE ($1::text IS NULL OR status = $1)
          ORDER BY criado_em DESC
          LIMIT $2 OFFSET $3`,
        [filtro, lim, off]
    );
    return { total: Number(total.rows[0]?.total ?? 0), pagina: Math.floor(off / lim) + 1, limite: lim, itens: itens.rows };
};

export const atualizarStatusPedido = async (id: number, status: string) => {
    if (!(STATUS_PEDIDO as readonly string[]).includes(status)) return null;
    const r = await query(
        `UPDATE pedidos SET status = $1, atualizado_em = NOW() WHERE id = $2 RETURNING id, status`,
        [status, id]
    );
    return r.rows[0] ?? null;
};

export const excluirPedido = async (id: number): Promise<boolean> => {
    const r = await query(`DELETE FROM pedidos WHERE id = $1`, [id]);
    return (r.rowCount ?? 0) > 0;
};
