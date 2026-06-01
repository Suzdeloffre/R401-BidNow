const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');
const { requireAuth } = require('../middleware/auth');

// List items (avec support optionnel de recherche par titre 'q')
router.get('/', async (req, res) => {
    try {
        const { status, q } = req.query;
        const db = getDB();
        const query = {};
        
        // Filtrage par statut si fourni
        if (status) {
            query.status = status;
        } else {
            query.status = { $in: ['active', 'ended'] };
        }

        // Extension : Recherche par titre via regex insensible à la casse
        if (q) {
            query.title = { $regex: q, $options: "i" };
        }

        const items = await db.collection('items')
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Extension : Obtenir l'historique des enchères sur lesquelles l'utilisateur a misé
// ATTENTION : Cette route doit impérativement être placée AVANT GET /:id pour éviter
// que "my-bids" ne soit capturé par le paramètre ":id" et provoque une erreur de cast ObjectId !
router.get('/my-bids', requireAuth, async (req, res) => {
    try {
        const db = getDB();
        
        // 1. Trouver toutes les mises faites par cet utilisateur
        const userBids = await db.collection('bids')
            .find({ bidder: req.user.username })
            .toArray();
        
        // 2. Extraire les IDs uniques des enchères
        const itemIds = [...new Set(userBids.map(bid => bid.itemId.toString()))]
            .map(id => new ObjectId(id));
        
        // Si aucune enchère n'a été misée
        if (itemIds.length === 0) {
            return res.json([]);
        }
        
        // 3. Charger les enchères correspondantes
        const items = await db.collection('items')
            .find({ _id: { $in: itemIds } })
            .sort({ createdAt: -1 })
            .toArray();
            
        res.json(items);
    } catch (err) {
        console.error("Erreur récupération mes mises :", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get detail
router.get('/:id', async (req, res) => {
    try {
        const db = getDB();
        const item = await db.collection('items').findOne({ _id: new ObjectId(req.params.id) });
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get bids for item
router.get('/:id/bids', async (req, res) => {
    try {
        const db = getDB();
        const bids = await db.collection('bids')
            .find({ itemId: new ObjectId(req.params.id) })
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();
        res.json(bids);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create item
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, description, startPrice, duration } = req.body;
        const db = getDB();

        if (!title || !startPrice || !duration) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const now = new Date();
        const endsAt = new Date(now.getTime() + duration * 60000);

        const newItem = {
            title,
            description,
            startPrice: parseFloat(startPrice),
            currentPrice: parseFloat(startPrice),
            currentBidder: null,
            ownerId: new ObjectId(req.user.id),
            ownerUsername: req.user.username,
            status: 'active',
            createdAt: now,
            endsAt: endsAt
        };

        const result = await db.collection('items').insertOne(newItem);
        res.status(201).json({ ...newItem, _id: result.insertedId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete item (only if ended and owner)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const db = getDB();
        const result = await db.collection('items').deleteOne({
            _id: new ObjectId(req.params.id),
            ownerId: new ObjectId(req.user.id),
            status: 'ended'
        });

        if (result.deletedCount === 0) {
            return res.status(403).json({ error: 'Cannot delete item (must be owner and auction must be ended)' });
        }

        // Also cleanup bids
        await db.collection('bids').deleteMany({ itemId: new ObjectId(req.params.id) });

        res.json({ message: 'Item deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
