import DuelMatch from "../models/DuelMatch.js";
import DuelHistory from "../models/DuelHistory.js";
import User from "../models/User.js";
import QueueItem from "../models/QueueItem.js";
import mongoose from "mongoose";
import { QUESTIONS } from "../utils/sampleQuestions.js";

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
        const io = req.app.get("io"); // io ni olish
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

        // MongoDB queue dan opponent izlash
        const queueItems = await QueueItem.find({});
        let opponent = null;

        for (const q of queueItems) {
            if (
                q.subject === subject &&
                q.betXP === betXP &&
                Math.abs(q.level - user.level) <= 2 &&
                q.userId.toString() !== userId.toString()
            ) {
                opponent = q;
                break;
            }
        }

        if (opponent) {
            // Opponent topildi — queue dan o'chirish
            await QueueItem.deleteOne({ _id: opponent._id });

            const opponentMatch = await DuelMatch.findById(opponent.matchId);
            if (!opponentMatch) {
                // Agar yo'q bo'lsa, queue ga qo'shish
                await QueueItem.create({ matchId: match._id, userId, subject, betXP, level: user.level });
                return res.status(201).json({ status: "waiting", matchId: match._id });
            }

            // combine into active match
            opponentMatch.players.push({ user: userId, acceptedAt: new Date() });
            opponentMatch.status = "active";
            opponentMatch.startedAt = new Date();

            // ✅ Savolni generate va saqlash
            let pool = [];
            if (opponentMatch.subject === 'mixed') {
                pool = Object.values(QUESTIONS).flat();
            } else {
                pool = QUESTIONS[opponentMatch.subject] || [];
            }
            if (!pool.length) return res.status(404).json({ message: "No questions found" });
            const q = pool[Math.floor(Math.random() * pool.length)];
            opponentMatch.question = {
                text: q.question,
                answers: q.options,
                correct: q.correct,
                xp: q.xp
            };
            await opponentMatch.save();

            // remove current waiting match
            await DuelMatch.findByIdAndDelete(match._id);

            const populated = await opponentMatch.populate("players.user", "name avatar level premium xp");

            // ✅ Socket.io orqali ikkala user ga notify: match found va question
            const playerIds = populated.players.map(p => p.user._id.toString());
            io.to(playerIds[0]).emit("matchFound", { match: populated });
            io.to(playerIds[1]).emit("matchFound", { match: populated });

            return res.status(201).json({ status: "matched", match: populated });
        } else {
            // no opponent — add to queue
            await QueueItem.create({ matchId: match._id, userId, subject, betXP, level: user.level });
            return res.status(201).json({ status: "waiting", matchId: match._id });
        }
    } catch (err) {
        console.error("requestDuel err:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ... qolgan funksiyalar o'zgarmaydi, faqat finishDuel da ham socket emit qilish mumkin, masalan, result ni yuborish uchun

export const finishDuel = async (req, res) => {
    try {
        const io = req.app.get("io"); // io ni olish
        const userId = req.user._id;
        const { duelId, winnerId } = req.body;
        // ... oldingi kod

        // After processing
        const populated = await match.populate("players.user", "name avatar level premium xp");

        res.json({
            message: "Result processed",
            match: populated,
            xp: winnerGain,
            win: winner._id.toString() === userId.toString()
        });

        // ✅ Socket orqali raqibga ham result yuborish
        const playerIds = populated.players.map(p => p.user._id.toString());
        io.to(playerIds[0]).emit("duelFinished", res.data);
        io.to(playerIds[1]).emit("duelFinished", res.data);

    } catch (err) {
        console.error("finishDuel err:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// cancelDuel da ham socket emit qilish mumkin, lekin optional