import 'dotenv/config';
import mongoose from 'mongoose';
import MealLog from './backend/src/models/MealLog.js';

async function checkLogs() {
    await mongoose.connect(process.env.MONGO_URI);
    const logs = await MealLog.find().sort({ createdAt: -1 }).limit(5);
    console.log(JSON.stringify(logs, null, 2));
    await mongoose.connection.close();
}

checkLogs().catch(console.error);
