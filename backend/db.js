const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'bidnow';

let db = null;
let client = null;

async function connectDB() {
    if (db) return db;
    try {
        client = new MongoClient(uri);
        await client.connect();
        console.log('Connected to MongoDB');
        db = client.db(dbName);
        return db;
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
}

function getDB() {
    if (!db) {
        throw new Error('Database not initialized. Call connectDB first.');
    }
    return db;
}

module.exports = { connectDB, getDB };
