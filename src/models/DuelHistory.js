// src/models/DuelHistory.js
import mongoose from "mongoose";

const duelHistorySchema = new mongoose.Schema({
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: "DuelMatch", required: true },
    players: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            xpChange: { type: Number, required: true },
        },
    ],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    subject: String,
    betXP: Number,
    createdAt: { type: Date, default: Date.now },
});

duelHistorySchema.index({ createdAt: -1 });

export default mongoose.model("DuelHistory", duelHistorySchema);
