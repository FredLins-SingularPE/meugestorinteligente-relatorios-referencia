import { Router } from 'express';
import { validateUUIDParam, validateBody, validateQueryParams } from '../middleware/validation.js';

function createFormTemplatesRoutes(pool) {
  const router = Router();

  const requireFormPermission = (action) => async (req, res, next) => {
    const user = req.currentUser;
    if (!user?.id) return res.status(401).json({ error: 'Autenticação necessária' });
    if (user.isAdmin) return next();
    if (!Array.isArray(user.groupIds) || user.groupIds.length === 0) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar os formulários.' });
    }
    try {
      const result = await pool.query(
        'SELECT 1 FROM user_group_permissions WHERE group_id = ANY($1::uuid[]) AND permission = $2 LIMIT 1',
        [user.groupIds, `rel_formularios:${action}`]
      );
      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar os formulários.' });
      }
      next();
    } catch (err) {
      console.error('[form-templates] erro ao verificar permissão:', err.message);
      res.status(500).json({ error: 'Erro ao verificar permissão dos formulários.' });
    }
  };

  router.get('/', requireFormPermission('VISUALIZAR'), validateQueryParams, async (req, res) => {
    try {
      const { limit, offset } = req.pagination;
      const searchTerm = req.searchTerm;

      const params = [];
      const conditions = [];

      if (searchTerm) {
        params.push(`%${searchTerm}%`);
        conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM form_templates ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count, 10);

      const dataParams = [...params];
      dataParams.push(limit);
      dataParams.push(offset);

      const dataResult = await pool.query(
        `SELECT * FROM form_templates ${whereClause} ORDER BY updated_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
        dataParams
      );

      res.json({
        data: dataResult.rows,
        total,
        page: req.pagination.page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      console.error('GET /form-templates error:', err.message);
      res.status(500).json({ error: 'Erro ao listar formulários', details: err.message });
    }
  });

  router.get('/:id', requireFormPermission('VISUALIZAR'), validateUUIDParam, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM form_templates WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Formulário não encontrado' });
      }
      res.json({ data: result.rows[0] });
    } catch (err) {
      console.error('GET /form-templates/:id error:', err.message);
      res.status(500).json({ error: 'Erro ao buscar formulário', details: err.message });
    }
  });

  const allowedColumns = ['name', 'description', 'content', 'header', 'footer', 'menu_ids', 'docx_template'];

  router.post('/', requireFormPermission('INCLUIR'), validateBody(['name']), async (req, res) => {
    try {
      const data = { ...req.body };
      delete data.id;

      const filtered = {};
      for (const col of allowedColumns) {
        if (data[col] !== undefined) {
          filtered[col] = data[col];
        }
      }

      const fields = Object.keys(filtered);
      const values = Object.values(filtered);
      const placeholders = values.map((_, i) => `$${i + 1}`);

      const result = await pool.query(
        `INSERT INTO form_templates (${fields.map(f => `"${f}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        values
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (err) {
      console.error('POST /form-templates error:', err.message);
      res.status(500).json({ error: 'Erro ao criar formulário', details: err.message });
    }
  });

  router.put('/:id', requireFormPermission('ALTERAR'), validateUUIDParam, validateBody([]), async (req, res) => {
    try {
      const existing = await pool.query('SELECT * FROM form_templates WHERE id = $1', [req.params.id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Formulário não encontrado' });
      }

      const data = { ...req.body };
      delete data.id;
      delete data.created_at;

      const filtered = {};
      for (const col of allowedColumns) {
        if (data[col] !== undefined) {
          filtered[col] = data[col];
        }
      }

      filtered.updated_at = new Date().toISOString();

      const setClauses = [];
      const values = [];
      let paramIndex = 1;
      for (const [field, value] of Object.entries(filtered)) {
        setClauses.push(`"${field}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
      values.push(req.params.id);

      await pool.query(
        `UPDATE form_templates SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        values
      );

      const result = await pool.query('SELECT * FROM form_templates WHERE id = $1', [req.params.id]);
      res.json({ data: result.rows[0] });
    } catch (err) {
      console.error('PUT /form-templates/:id error:', err.message);
      res.status(500).json({ error: 'Erro ao atualizar formulário', details: err.message });
    }
  });

  router.delete('/:id', requireFormPermission('EXCLUIR'), validateUUIDParam, async (req, res) => {
    try {
      const existing = await pool.query('SELECT id FROM form_templates WHERE id = $1', [req.params.id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Formulário não encontrado' });
      }
      await pool.query('DELETE FROM form_templates WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Formulário excluído com sucesso' });
    } catch (err) {
      console.error('DELETE /form-templates/:id error:', err.message);
      res.status(500).json({ error: 'Erro ao excluir formulário', details: err.message });
    }
  });

  return router;
}

export { createFormTemplatesRoutes };
