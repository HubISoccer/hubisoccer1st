const db = require('../config/db');

exports.getAll = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM roles ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Ajoutez create, update, delete si nécessaire