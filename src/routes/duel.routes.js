import express from "express";
import {
    requestDuel,
    checkDuelStatus,
    cancelDuel,
    finishDuel,
    listMatches,
    getQuestion
} from "../controllers/duel.controller.js";
import protect from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/request", protect, requestDuel);
router.get("/status/:id", protect, checkDuelStatus);
router.post("/cancel", protect, cancelDuel);
router.post("/finish", protect, finishDuel);
router.get("/question", protect, getQuestion);
router.get("/list", protect, listMatches);

export default router;
