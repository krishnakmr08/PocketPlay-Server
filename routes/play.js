import express from "express";
import authMiddleWare from "../middleware/authentication.js";
import { getPlays } from "../controllers/play.js";

const router = express.Router();

router.use(authMiddleWare);

router.get("/list", getPlays);

export default router;
