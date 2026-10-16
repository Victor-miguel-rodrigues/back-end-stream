import { Request, Response } from 'express';
import { validarPedido, criarPedido, listarPedidos, atualizarStatusPedido, excluirPedido } from '../services/pedidoService';

const idValido = (v: any): number | null => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 && n < 2147483647 ? n : null;
};

class PedidoController {
    // POST /pedidos  (publico, com limite por IP) — "Criar conta" do site/app
    async criar(req: Request, res: Response) {
        try {
            const pedido = validarPedido(req.body);
            if (!pedido) {
                return res.status(400).json({ status: false, message: 'Dados invalidos. Confira o usuario e o e-mail.' });
            }
            const ip = String(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0');
            const resultado = await criarPedido(pedido, ip);
            // Duplicado responde igual (nao revela se o e-mail ja tem pedido)
            return res.status(resultado === 'CRIADO' ? 201 : 200).json({ status: true, message: 'Solicitacao recebida' });
        } catch (error) {
            console.error('[pedidos] erro ao criar:', error);
            return res.status(500).json({ status: false, message: 'Erro interno do servidor' });
        }
    }

    // GET /admin/pedidos?status=pendente&pagina=1&limite=50
    async listar(req: Request, res: Response) {
        try {
            const status = typeof req.query.status === 'string' ? req.query.status : null;
            const dados = await listarPedidos(status, Number(req.query.limite), Number(req.query.pagina));
            return res.json({ status: true, ...dados });
        } catch (error) {
            console.error('[pedidos] erro ao listar:', error);
            return res.status(500).json({ status: false, message: 'Erro interno do servidor' });
        }
    }

    // PUT /admin/pedidos/:id/status  { "status": "pagamento_enviado" }
    async atualizarStatus(req: Request, res: Response) {
        try {
            const id = idValido(req.params.id);
            const status = typeof req.body?.status === 'string' ? req.body.status : '';
            if (!id) return res.status(400).json({ status: false, message: 'Id invalido' });
            const r = await atualizarStatusPedido(id, status);
            if (!r) return res.status(404).json({ status: false, message: 'Pedido nao encontrado ou status invalido' });
            return res.json({ status: true, pedido: r });
        } catch (error) {
            console.error('[pedidos] erro ao atualizar:', error);
            return res.status(500).json({ status: false, message: 'Erro interno do servidor' });
        }
    }

    // DELETE /admin/pedidos/:id
    async excluir(req: Request, res: Response) {
        try {
            const id = idValido(req.params.id);
            if (!id) return res.status(400).json({ status: false, message: 'Id invalido' });
            const ok = await excluirPedido(id);
            return ok ? res.json({ status: true }) : res.status(404).json({ status: false, message: 'Pedido nao encontrado' });
        } catch (error) {
            console.error('[pedidos] erro ao excluir:', error);
            return res.status(500).json({ status: false, message: 'Erro interno do servidor' });
        }
    }
}

export default new PedidoController();
