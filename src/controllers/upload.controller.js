import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// multer saves file to temp path; we upload it to Cloudinary then delete temp
export const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file" });

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "avatars",
            transformation: [{ width: 500, height: 500, crop: "fill" }],
        });

        // remove temp file
        fs.unlinkSync(req.file.path);

        res.json({ url: result.secure_url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};
