import { OAuth2Client } from "google-auth-library";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";

import { BadRequestError, UnauthenticatedError } from "../errors/index.js";

import User from "../models/User.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateUniqueUsername = async (name) => {
  const base = (name || "user").replace(/\s/g, "").toLowerCase().slice(0, 6);

  for (let i = 0; i < 5; i++) {
    const username = base + Math.random().toString(36).slice(2, 8);

    const exists = await User.exists({ username });

    if (!exists) {
      return username;
    }
  }

  throw new Error("Could not generate a unique username");
};

export const signInWithGoogle = async (req, res) => {
  const { id_token } = req.body;

  if (!id_token) {
    throw new BadRequestError("ID token is required");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  const { email, email_verified } = payload;

  if (!email || !email_verified) {
    throw new UnauthenticatedError("Google authentication failed");
  }

  let user = await User.findOne({ email });

  if (user) {
    const accessToken = user.createAccessToken();
    const refreshToken = user.createRefreshToken();

    return res.status(StatusCodes.OK).json({
      user,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  }

  const username = await generateUniqueUsername(payload.name);

  user = new User({
    email: payload.email,
    username,
    name: payload.name,
    picture: payload.picture,
  });

  await user.save();

  const accessToken = user.createAccessToken();
  const refreshToken = user.createRefreshToken();

  return res.status(StatusCodes.CREATED).json({
    user,
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
};

export const refreshToken = async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw new BadRequestError("Refresh token is required");
  }

  try {
    const payload = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(payload.userId);

    if (!user) {
      throw new UnauthenticatedError("Invalid refresh token");
    }

    const newAccessToken = user.createAccessToken();
    const newRefreshToken = user.createRefreshToken();

    return res.status(StatusCodes.OK).json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    });
  } catch (error) {
    console.error("Error refreshing token:", error);

    throw new UnauthenticatedError("Invalid refresh token");
  }
};
