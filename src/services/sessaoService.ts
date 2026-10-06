import { query } from '../database/connection';

export async function limparSessoesInativas(): Promise<number> {
    try {
        const result = await query(
            `UPDATE sessoes
             SET ativo = FALSE
             WHERE ativo = TRUE
               AND (
                   (reproduzindo = TRUE AND ultima_atividade < NOW() - INTERVAL '2 hours')
                   OR
                   (reproduzindo = FALSE AND ultima_atividade < NOW() - INTERVAL '15 minutes')
                   OR
                   (data_expiracao < NOW())
               )
             RETURNING id, usuario_id`
        );

        if (result.rowCount && result.rowCount > 0) {
            console.log(`[SessaoService] ${result.rowCount} sessoes inativas desativadas`);

            for (const row of result.rows) {
                await query(
                    `INSERT INTO logs_sistema (usuario_id, acao, descricao)
                     VALUES ($1, $2, $3)`,
                    [row.usuario_id, 'logout_inatividade', 'Sessao encerrada por inatividade']
                );
            }
        }

        return result.rowCount ?? 0;
    } catch (error) {
        console.error('[SessaoService] Erro ao limpar sessoes:', error);
        return 0;
    }
}