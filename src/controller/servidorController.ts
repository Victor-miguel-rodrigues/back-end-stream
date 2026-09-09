// src/controllers/servidorController.ts
import { Request, Response } from "express";
import { query } from "../database/connection";
import { RequestWithAdmin } from "../types/admin";

export class ServidorController {
    // ============================================
    // LISTAR SERVIDORES (PÚBLICO - PARA USUÁRIOS)
    // ============================================
    async listarServidoresPublicos(req: Request, res: Response): Promise<Response> {
        try {
            const { tier } = req.query;

            let queryText = `SELECT id, nome, url, tier, ordem FROM servidores WHERE ativo = TRUE`;
            let params: any[] = [];

            if (tier && (tier === 'free' || tier === 'vip')) {
                queryText += ` AND tier = $1 ORDER BY ordem ASC`;
                params.push(tier);
            } else {
                queryText += ` ORDER BY tier, ordem ASC`;
            }

            const result = await query(queryText, params);

            return res.json({
                status: true,
                dados: result.rows
            });
        } catch (error) {
            console.error('Erro ao listar servidores:', error);
            return res.status(500).json({
                status: false,
                message: 'Erro ao listar servidores'
            });
        }
    }

    // ============================================
    // LISTAR TODOS OS SERVIDORES (ADMIN)
    // ============================================
    async listarServidoresAdmin(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: 'Não autorizado'
                });
            }

            const result = await query(
                `SELECT * FROM servidores ORDER BY tier, ordem ASC`
            );

            return res.json({
                status: true,
                dados: result.rows
            });
        } catch (error) {
            console.error('Erro ao listar servidores:', error);
            return res.status(500).json({
                status: false,
                message: 'Erro ao listar servidores'
            });
        }
    }

    // ============================================
    // BUSCAR UM SERVIDOR (ADMIN)
    // ============================================
    async buscarServidor(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;
            const { id } = req.params;

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: 'Não autorizado'
                });
            }

            const result = await query(
                `SELECT * FROM servidores WHERE id = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: 'Servidor não encontrado'
                });
            }

            return res.json({
                status: true,
                dados: result.rows[0]
            });
        } catch (error) {
            console.error('Erro ao buscar servidor:', error);
            return res.status(500).json({
                status: false,
                message: 'Erro ao buscar servidor'
            });
        }
    }

    // ============================================
    // CRIAR SERVIDOR (ADMIN)
    // ============================================
    async criarServidor(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;
            const { nome, url, tier, ordem, ativo } = req.body;

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: 'Não autorizado'
                });
            }

            if (!nome || !url || !tier) {
                return res.status(400).json({
                    status: false,
                    message: 'Nome, URL e tier são obrigatórios'
                });
            }

            const result = await query(
                `INSERT INTO servidores (nome, url, tier, ordem, ativo)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [nome, url, tier, ordem || 0, ativo !== false]
            );

            return res.status(201).json({
                status: true,
                message: 'Servidor criado com sucesso',
                dados: result.rows[0]
            });
        } catch (error) {
            console.error('Erro ao criar servidor:', error);
            return res.status(500).json({
                status: false,
                message: 'Erro ao criar servidor'
            });
        }
    }

    // ============================================
    // ATUALIZAR SERVIDOR (ADMIN)
    // ============================================
    async atualizarServidor(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;
            const { id } = req.params;
            const { nome, url, tier, ordem, ativo } = req.body;

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: 'Não autorizado'
                });
            }

            const result = await query(
                `UPDATE servidores 
                 SET nome = $1, url = $2, tier = $3, ordem = $4, ativo = $5, data_atualizacao = NOW()
                 WHERE id = $6
                 RETURNING *`,
                [nome, url, tier, ordem || 0, ativo !== false, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: 'Servidor não encontrado'
                });
            }

            return res.json({
                status: true,
                message: 'Servidor atualizado com sucesso',
                dados: result.rows[0]
            });
        } catch (error) {
            console.error('Erro ao atualizar servidor:', error);
            return res.status(500).json({
                status: false,
                message: 'Erro ao atualizar servidor'
            });
        }
    }

    // ============================================
    // EXCLUIR SERVIDOR (ADMIN)
    // ============================================
    async excluirServidor(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;
            const { id } = req.params;

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: 'Não autorizado'
                });
            }

            const result = await query(
                `DELETE FROM servidores WHERE id = $1 RETURNING id`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: 'Servidor não encontrado'
                });
            }

            return res.json({
                status: true,
                message: 'Servidor excluído com sucesso'
            });
        } catch (error) {
            console.error('Erro ao excluir servidor:', error);
            return res.status(500).json({
                status: false,
                message: 'Erro ao excluir servidor'
            });
        }
    }
}

export default new ServidorController();