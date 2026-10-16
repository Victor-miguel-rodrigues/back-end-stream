export declare const STATUS_PEDIDO: readonly ['pendente', 'pagamento_enviado', 'pago', 'login_enviado', 'cancelado'];
export type StatusPedido = (typeof STATUS_PEDIDO)[number];
export interface PedidoValido {
    usuario: string;
    email: string;
    origem: 'site' | 'app';
}
export declare const validarPedido: (body: any) => PedidoValido | null;
export declare const criarPedido: (p: PedidoValido, ip: string) => Promise<'CRIADO' | 'DUPLICADO'>;
export declare const listarPedidos: (status: string | null, limite: number, pagina: number) => Promise<{
    total: number;
    pagina: number;
    limite: number;
    itens: any[];
}>;
export declare const atualizarStatusPedido: (id: number, status: string) => Promise<any>;
export declare const excluirPedido: (id: number) => Promise<boolean>;
//# sourceMappingURL=pedidoService.d.ts.map