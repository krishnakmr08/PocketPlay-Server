import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Play from "../models/Play.js";

const socketService = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("No token provided"));
      }

      const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      const user = await User.findById(payload.userId);

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = {
        id: user._id,
        name: user.name,
      };

      next();
    } catch (error) {
      console.error("Socket Auth Error:", error);

      next(new Error("Authentication failed"));
    }
  });

  // Socket connection
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Join a stream room
    socket.on("join-stream", async ({ playId } = {}) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(playId)) {
          return socket.emit("socket-error", {
            message: "Invalid playId",
          });
        }

        const exists = await Play.exists({
          _id: playId,
        });

        if (!exists) {
          return socket.emit("socket-error", {
            message: "Play not found",
          });
        }

        socket.join(playId);

        console.log(`Socket ${socket.id} joined stream ${playId}`);
      } catch (error) {
        console.error(error);

        socket.emit("socket-error", {
          message: "Join failed",
        });
      }
    });

    // Get play information
    socket.on("get-play-info", async ({ playId } = {}) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(playId)) {
          return socket.emit("socket-error", {
            message: "Invalid playId",
          });
        }

        const play = await Play.findById(playId)
          .populate("comments.user")
          .lean();

        if (!play) {
          return socket.emit("socket-error", {
            message: "Play not found",
          });
        }

        const isLiked = play.liked_by.some((id) => id.equals(socket.user.id));

        const isStarred = play.starred_by.some((id) =>
          id.equals(socket.user.id),
        );

        socket.emit("stream-play-info", {
          _id: play._id,
          likes: play.likes,
          rating: play.rating,
          starred: play.starred,
          comments: play.comments,
          is_liked: isLiked,
          is_starred: isStarred,
        });
      } catch (error) {
        console.error(error);

        socket.emit("socket-error", {
          message: "Failed to fetch play info",
        });
      }
    });

    // Like a play
    socket.on("like-play", async ({ playId } = {}) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(playId)) {
          return socket.emit("socket-error", {
            message: "Invalid playId",
          });
        }

        const updatedPlay = await Play.findOneAndUpdate(
          {
            _id: playId,
            liked_by: {
              $ne: socket.user.id,
            },
          },
          {
            $inc: {
              likes: 1,
            },
            $addToSet: {
              liked_by: socket.user.id,
            },
          },
          {
            new: true,
          },
        );

        if (!updatedPlay) {
          return;
        }

        io.to(playId).emit("stream-likes", {
          playId,
          likes: updatedPlay.likes,
        });
      } catch (error) {
        console.error(error);

        socket.emit("socket-error", {
          message: "Like failed",
        });
      }
    });

    // Add a comment
    socket.on("new-comment", async ({ playId, comment } = {}) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(playId) || !comment?.trim()) {
          return socket.emit("socket-error", {
            message: "Invalid data",
          });
        }

        const updatedPlay = await Play.findByIdAndUpdate(
          playId,
          {
            $push: {
              comments: {
                user: socket.user.id,
                comment: comment,
              },
            },
          },
          {
            new: true,
          },
        ).populate("comments.user");

        if (!updatedPlay) {
          return socket.emit("socket-error", {
            message: "Play not found",
          });
        }

        io.to(playId).emit("stream-comments", updatedPlay.comments);
      } catch (error) {
        console.error(error);

        socket.emit("socket-error", {
          message: "Comment failed",
        });
      }
    });

    // Send live reaction
    socket.on("send-reaction", ({ playId, reaction } = {}) => {
      if (
        !mongoose.Types.ObjectId.isValid(playId) ||
        !reaction ||
        !socket.rooms.has(playId)
      ) {
        return;
      }

      io.to(playId).emit("stream-reactions", {
        emoji: reaction,
        userId: socket.user.id,
      });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user?.id}`);
    });
  });
};

export default socketService;
