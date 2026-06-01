const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { connectDB, getDB } = require('./db');
const { setupSocket } = require('./socket');
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // In production, restrict this
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);

// Socket.IO
setupSocket(io);

// Auction closure logic (global interval every 5 seconds)
setInterval(async () => {
    try {
        const db = getDB();
        const now = new Date();
        const itemsToClose = await db.collection('items').find({
            status: 'active',
            endsAt: { $lte: now }
        }).toArray();

        for (const item of itemsToClose) {
            await db.collection('items').updateOne(
                { _id: item._id },
                { $set: { status: 'ended' } }
            );

            io.to(`item:${item._id}`).emit('auction-ended', {
                itemId: item._id,
                winner: item.currentBidder,
                finalPrice: item.currentPrice
            });

            io.emit('item-updated', {
                itemId: item._id,
                currentPrice: item.currentPrice,
                currentBidder: item.currentBidder,
                status: 'ended'
            });
            
            console.log(`Auction ended: ${item.title}`);
        }
    } catch (err) {
        // Log error but don't crash
        // console.error('Error in closure interval:', err);
    }
}, 5000);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
