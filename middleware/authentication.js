import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { UnauthenticatedError, NotFoundError } from "../errors/index.js";

const authMiddleWare = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthenticatedError("Authentication invalid");
  }

  const token = authHeader.split(" ")[1];

  let payload;

  try {
    payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new UnauthenticatedError("Authentication invalid");
  }

  const user = await User.findById(payload.userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  req.user = {
    id: payload.userId,
  };

  next();
};

export default authMiddleWare;
