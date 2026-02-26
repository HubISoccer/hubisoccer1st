const db = require('../config/db');

exports.getAll = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM engagements ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

exports.create = async (req, res) => {
    const { titre, description } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO engagements (titre, description) VALUES ($1, $2) RETURNING *',
            [titre, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { titre, description } = req.body;
    try {
        const result = await db.query(
            'UPDATE engagements SET titre = $1, description = $2 WHERE id = $3 RETURNING *',
            [titre, description, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Non trouvé' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM engagements WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Non trouvé' });
        res.json({ message: 'Supprimé' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};