import User from "../models/User.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";
import { generateDiceBearInitial } from "../utils/avatars.js";

// ✅ REGISTER
export const register = async (req, res) => {
    try {
        const { username, name, email, password, gender } = req.body;

        if (!username || !name || !email || !password || !gender)
            return res.status(400).json({ message: "Barcha maydonlar majburiy" });

        if (await User.findOne({ email }))
            return res.status(400).json({ message: "Email mavjud" });

        if (await User.findOne({ username }))
            return res.status(400).json({ message: "Username band" });

        const hashed = await bcrypt.hash(password, 10);
        const avatar = generateDiceBearInitial(username);

        const user = await User.create({
            username,
            name,
            email,
            password: hashed,
            gender,
            avatar,
        });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            token: generateToken(user._id), // ✅ eskirmaydi
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ✅ LOGIN
export const login = async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email va parol majburiy" });
        }

        email = email.toLowerCase();

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Email topilmadi" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Parol xato" });
        }

        return res.json({
            _id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            token: generateToken(user._id),
        });
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ message: "Server xatosi" });
    }
};
