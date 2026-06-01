const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { getDB } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

function setupSocket(io) {
    // Middleware to authenticate socket
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: No token'));
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.username}`);

        socket.on('join-item', (itemId) => {
            socket.join(`item:${itemId}`);
            console.log(`${socket.user.username} joined item:${itemId}`);
        });

        socket.on('leave-item', (itemId) => {
            socket.leave(`item:${itemId}`);
            console.log(`${socket.user.username} left item:${itemId}`);
        });

        socket.on('place-bid', async ({ itemId, amount }) => {
            try {
                const db = getDB();
                const item = await db.collection('items').findOne({ _id: new ObjectId(itemId) });

                if (!item) {
                    return socket.emit('bid-rejected', { reason: 'Item not found' });
                }

                // Business rules
                if (item.status !== 'active' || new Date() > new Date(item.endsAt)) {
                    return socket.emit('bid-rejected', { reason: 'Auction is closed' });
                }

                if (item.ownerId.toString() === socket.user.id) {
                    return socket.emit('bid-rejected', { reason: 'You cannot bid on your own item' });
                }

                if (isNaN(amount) || amount <= item.currentPrice) {
                    return socket.emit('bid-rejected', { reason: 'Amount too low' });
                }

                // Update item
                await db.collection('items').updateOne(
                    { _id: new ObjectId(itemId) },
                    { $set: { currentPrice: amount, currentBidder: socket.user.username } }
                );

                // Insert bid record
                const newBid = {
                    itemId: new ObjectId(itemId),
                    bidder: socket.user.username,
                    amount,
                    createdAt: new Date()
                };
                await db.collection('bids').insertOne(newBid);

                // Broadcast
                io.to(`item:${itemId}`).emit('new-bid', {
                    itemId,
                    amount,
                    bidder: socket.user.username,
                    at: newBid.createdAt
                });

                io.emit('item-updated', {
                    itemId,
                    currentPrice: amount,
                    currentBidder: socket.user.username,
                    status: 'active'
                });

            } catch (err) {
                console.error(err);
                socket.emit('bid-rejected', { reason: 'Internal server error' });
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.username}`);
        });
    });
}

module.exports = { setupSocket };
