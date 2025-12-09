import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "../src/config/db.js";
import { Server } from "socket.io"; // Yangi: socket.io
import http from "http"; // Yangi: http server uchun

import authRoutes from "../src/routes/auth.routes.js";
import ratingRoutes from "../src/routes/rating.routes.js";
import userRoutes from "../src/routes/user.routes.js";
import duelRoutes from "../src/routes/duel.routes.js";
dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app); // Yangi: socket.io uchun http server
const io = new Server(server, {
    cors: {
        origin: "*", // RN app uchun, productionda cheklang
        methods: ["GET", "POST"]
    }
}); // Yangi: socket.io server

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rating", ratingRoutes);
app.use("/api/user", userRoutes);
app.use("/api/duel", duelRoutes);
app.use('/health', (req, res) => {
    res.send('API is running...');
});

// ✅ Socket.io connection handling
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User duel queue ga qo'shilganda room ga join
    socket.on("joinDuelQueue", (userId) => {
        socket.join(userId); // User ID room ga join
    });

    // Disconnect
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// io ni controllerlarga export qilish uchun (duel.controller.js da ishlatish)
app.set("io", io); // io ni app ga set qilamiz

export default { app, server }; // server ni export, app.js o'rniga server.listen()