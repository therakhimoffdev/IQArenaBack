import express from "express";
import { getTopUsers } from "../controllers/rating.controller.js";

const router = express.Router();
router.get("/", getTopUsers);

export default router;
