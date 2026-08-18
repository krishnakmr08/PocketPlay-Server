import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import { connectDB } from "./config/connectDB.js";
import notFoundMiddleware from "./middleware/not-found.js";
import errorHandlerMiddleware from "./middleware/error-handler.js";
import authRouter from "./routes/auth.js";
import playRouter from "./routes/play.js";
import socketService from "./sockets/socketService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ?? 3000;
const hlsPath = path.join(__dirname, "./hls");

const app = express();

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

socketService(io);

app.use("/auth", authRouter);
app.use("/play", playRouter);

app.use("/hls", express.static(hlsPath));

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const startServer = async () => {
  try {
    await connectDB(process.env.MONGO_URI);

    server.listen(PORT, () => {
      console.log(`HTTP server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
