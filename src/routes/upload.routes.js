import express from "express";
import multer from "multer";
import { uploadAvatar } from "../controllers/upload.controller.js";

const router = express.Router();

// multer setup: temp storage in /tmp/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "tmp/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

router.post("/avatar", upload.single("file"), uploadAvatar);

export default router;
