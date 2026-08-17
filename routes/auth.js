import express from "express";
import { signInWithGoogle } from "../controllers/auth.js";

const router = express.Router();

router.post("/login", signInWithGoogle);

export default router;
