// src/models/DuelMatch.js
import mongoose from "mongoose";

const duelMatchSchema = new mongoose.Schema({
    subject: String,
    betXP: Number,

    players: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            acceptedAt: Date,
        },
    ],

    status: {
        type: String,
        enum: ["waiting", "matched", "active", "finished", "cancelled"],
        default: "waiting",
    },

    createdAt: { type: Date, default: Date.now },
    startedAt: Date,
    finishedAt: Date,

    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

export default mongoose.model("DuelMatch", duelMatchSchema);
