import express from "express";
import { signInWithGoogle, refreshToken } from "../controllers/auth.js";

const router = express.Router();

router.post("/login", signInWithGoogle);
router.post("/refresh-token", refreshToken);

export default router;
