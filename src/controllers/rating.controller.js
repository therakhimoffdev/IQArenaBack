import User from "../models/User.js";

export const getTopUsers = async (req, res) => {
    const users = await User.find().sort({ xp: -1 }).limit(100);
    res.json(users);
};
