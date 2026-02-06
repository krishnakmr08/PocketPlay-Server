require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/connectDB");
const notFoundMiddleware = require("./middleware/not-found");
const errorHandlerMiddleware = require("./middleware/error-handler");

const authRouter = require("./routes/auth");
const playRouter = require("./routes/play");

const socketService = require("./controllers/sockets");

const app = express();

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

app.use((req, res, next) => {
  req.io = io;
  next();
});

socketService(io);

app.use("/auth", authRouter);
app.use("/play", playRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const startServer = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    server.listen(process.env.PORT || 3000, () =>
      console.log(
        `HTTP server is running on http://localhost:${process.env.PORT || 3000}`,
      ),
    );
  } catch (error) {
    console.log(error);
  }
};

startServer();
