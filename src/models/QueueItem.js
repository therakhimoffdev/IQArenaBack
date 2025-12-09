import mongoose from 'mongoose';

const queueItemSchema = new mongoose.Schema({
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'DuelMatch', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    betXP: { type: Number, required: true },
    level: { type: Number, required: true },
    ts: { type: Date, default: Date.now },
});

export default mongoose.model('QueueItem', queueItemSchema);