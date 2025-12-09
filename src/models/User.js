import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true },
        avatar: { type: String },
        phone: { type: String },
        address: { type: String },
        gender: { type: String, default: "other" },
        role: { type: String, default: "user" },
        phone: { type: String, default: "" },
        address: { type: String, default: "" },
        xp: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        premium: { type: Boolean, default: false },

        ip: { type: String },
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);
