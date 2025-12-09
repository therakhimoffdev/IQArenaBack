import DuelMatch from "../models/DuelMatch.js";
import DuelHistory from "../models/DuelHistory.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { QUESTIONS } from "../utils/sampleQuestions.js";

/*
 In-memory queue:
 queue = [{ matchId, userId, subject, betXP, level, ts }]
 For production use Redis.
*/
const queue = [];
const FREEMIUM_MAX_BET = 300;
const FREEMIUM_DAILY_LIMIT = 1000;
const DUEL_COOLDOWN_MS = 8 * 1000;

const getTodayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

export const requestDuel = async (req, res) => {
    try {
        const userId = req.user._id;
        const { subject, betXP } = req.body;

        if (!subject) return res.status(400).json({ message: "subject required" });
        if (!betXP || typeof betXP !== "number" || betXP <= 0) return res.status(400).json({ message: "betXP must be > 0" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // cooldown: check last created match
        const last = await DuelMatch.findOne({ "players.user": userId }).sort({ createdAt: -1 }).lean();
        if (last && last.createdAt) {
            const diff = Date.now() - new Date(last.createdAt).getTime();
            if (diff < DUEL_COOLDOWN_MS) return res.status(429).json({ message: "Too many requests. Wait a bit." });
        }

        // freemium checks
        if (!user.premium) {
            if (betXP > FREEMIUM_MAX_BET) return res.status(403).json({ message: `Max bet for free users is ${FREEMIUM_MAX_BET}` });
            const todayStart = getTodayStart();
            const agg = await DuelMatch.aggregate([
                { $match: { createdBy: user._id, createdAt: { $gte: todayStart } } },
                { $group: { _id: null, sum: { $sum: "$betXP" } } }
            ]);
            const used = (agg[0] && agg[0].sum) || 0;
            if (used + betXP > FREEMIUM_DAILY_LIMIT) return res.status(403).json({ message: "Daily free-user bet limit exceeded" });
        }

        // Create waiting match
        const match = await DuelMatch.create({
            subject,
            betXP,
            players: [{ user: userId, acceptedAt: new Date() }],
            createdBy: userId,
            status: "waiting"
        });

        // Try to find opponent in queue
        const opponentIndex = queue.findIndex(q =>
            q.subject === subject &&
            q.betXP === betXP &&
            Math.abs(q.level - user.level) <= 2 &&
            q.userId.toString() !== userId.toString()
        );

        if (opponentIndex !== -1) {
            const opponent = queue.splice(opponentIndex, 1)[0];
            // fetch opponent's match (waiting) to reuse or just create active match combining both
            const opponentMatch = await DuelMatch.findById(opponent.matchId);
            if (!opponentMatch) {
                // if missing, just push this match to queue
                queue.push({ matchId: match._id, userId, subject, betXP, level: user.level, ts: Date.now() });
                return res.status(201).json({ status: "waiting", matchId: match._id });
            }

            // combine into active match: we will use opponentMatch as main
            opponentMatch.players.push({ user: userId, acceptedAt: new Date() });
            opponentMatch.status = "active";
            opponentMatch.startedAt = new Date();
            await opponentMatch.save();

            // remove current created waiting match since opponentMatch is used
            await DuelMatch.findByIdAndDelete(match._id);

            const populated = await opponentMatch.populate("players.user", "name avatar level premium xp");
            return res.status(201).json({ status: "matched", match: populated });
        } else {
            // no opponent found — add to queue
            queue.push({ matchId: match._id, userId, subject, betXP, level: user.level, ts: Date.now() });
            return res.status(201).json({ status: "waiting", matchId: match._id });
        }
    } catch (err) {
        console.error("requestDuel err:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const checkDuelStatus = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });
        const match = await DuelMatch.findById(id).populate("players.user", "name avatar level premium xp");
        if (!match) return res.status(404).json({ message: "Match not found" });
        res.json({ match });
    } catch (err) {
        console.error("checkDuelStatus err:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const cancelDuel = async (req, res) => {
    try {
        const { matchId } = req.body;
        if (!matchId) return res.status(400).json({ message: "matchId required" });

        const match = await DuelMatch.findById(matchId);
        if (!match) return res.status(404).json({ message: "Match not found" });

        if (match.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not allowed" });
        }

        match.status = "cancelled";
        await match.save();

        // remove from queue if present
        const idx = queue.findIndex(q => q.matchId.toString() === match._id.toString());
        if (idx !== -1) queue.splice(idx, 1);

        res.json({ message: "Cancelled" });
    } catch (err) {
        console.error("cancelDuel err:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * finishDuel
 * body: { duelId, correct (bool) }  (client indicates whether this user answered correctly)
 *
 * Simple approach:
 * - trust the client who calls finish with winnerId OR we decide server-side by both players' submissions.
 * We'll implement: the client who calls finish with { duelId, winnerId } will set finished.
 * In production: implement mutual confirmation or signature.
 */
export const finishDuel = async (req, res) => {
    try {
        const userId = req.user._id;
        const { duelId, winnerId } = req.body;
        if (!duelId || !winnerId) return res.status(400).json({ message: "duelId and winnerId required" });
        if (!mongoose.Types.ObjectId.isValid(duelId)) return res.status(400).json({ message: "Invalid duelId" });

        const match = await DuelMatch.findById(duelId);
        if (!match) return res.status(404).json({ message: "Match not found" });
        if (match.status === "finished") return res.status(400).json({ message: "Already finished" });

        const participantIds = match.players.map(p => p.user.toString());
        if (!participantIds.includes(winnerId)) return res.status(400).json({ message: "Winner not participant" });

        // finalize
        match.status = "finished";
        match.finishedAt = new Date();
        match.winner = winnerId;
        await match.save();

        // payout XP
        const base = match.betXP;
        const winner = await User.findById(winnerId);
        const losers = match.players.filter(p => p.user.toString() !== winnerId).map(p => p.user);

        let winnerGain = base;
        if (winner.premium) winnerGain = Math.round(base * 2);

        const history = { matchId: match._id, players: [], winner: winner._id, subject: match.subject, betXP: match.betXP };

        // winner update
        winner.xp = (winner.xp || 0) + winnerGain;
        winner.victories = (winner.victories || 0) + 1;
        winner.streak = (winner.streak || 0) + 1;
        await winner.save();
        history.players.push({ user: winner._id, xpChange: winnerGain });

        // losers update
        for (const loserId of losers) {
            const loser = await User.findById(loserId);
            if (!loser) continue;
            const loss = base;
            loser.xp = Math.max(0, (loser.xp || 0) - loss);
            loser.streak = 0;
            await loser.save();
            history.players.push({ user: loser._id, xpChange: -loss });
        }

        await DuelHistory.create(history);

        const populated = await match.populate("players.user", "name avatar level premium xp");

        res.json({
            message: "Result processed",
            match: populated,
            xp: winnerGain,
            win: winner._id.toString() === userId.toString()
        });

    } catch (err) {
        console.error("finishDuel err:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// admin
export const listMatches = async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
        const matches = await DuelMatch.find().sort({ createdAt: -1 }).limit(200).populate("players.user", "name avatar level");
        res.json({ matches });
    } catch (err) {
        console.error("listMatches err:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// simple question endpoint
export const getQuestion = async (req, res) => {
    try {
        const subject = req.query.subject || null;
        // choose random question from sample pool for subject or any
        const pool = subject ? QUESTIONS.filter(q => q.subject === subject) : QUESTIONS;
        if (!pool.length) return res.status(404).json({ message: "No questions" });
        const q = pool[Math.floor(Math.random() * pool.length)];
        // return minimal info: text, answers, correct (in prod do not send correct)
        return res.json({ question: { id: q.id, text: q.text, answers: q.answers, correct: q.correct } });
    } catch (err) {
        console.error("getQuestion err:", err);
        res.status(500).json({ message: "Server error" });
    }
};
