import mongoose from 'mongoose';

const duelMatchSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    betXP: { type: Number, required: true },
    players: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            acceptedAt: Date
        }
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['waiting', 'active', 'matched', 'finished', 'cancelled'], default: 'waiting' },
    startedAt: Date,
    finishedAt: Date,
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    question: {  // ✅ Yangi maydon: Savolni saqlash uchun
        text: String,
        answers: [String],
        correct: String,
        xp: Number
    }
}, { timestamps: true });

export default mongoose.model('DuelMatch', duelMatchSchema);