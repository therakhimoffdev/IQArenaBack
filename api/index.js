import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "../src/config/db.js"

import authRoutes from "../src/routes/auth.routes.js";
import ratingRoutes from "../src/routes/rating.routes.js";
import userRoutes from "../src/routes/user.routes.js";
import duelRoutes from "../src/routes/duel.routes.js";
dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rating", ratingRoutes);
app.use("/api/user", userRoutes);
app.use("/api/duel", duelRoutes);
app.use('/', (req, res) => {
    res.send('API is running...');
});
export default app;
