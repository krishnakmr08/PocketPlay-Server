<div align="center">

# 🎥 PocketPlay Server

**Real-time video streaming backend with HLS playback, live comments, likes, emoji reactions, and Google OAuth authentication using JWT tokens.**

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socketdotio&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT_+_Google_OAuth-F7B731?style=flat-square&logo=jose&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)

</div>

---

## Features

- 🔐 **Google OAuth Authentication** — Secure user login using Google ID tokens
- 🎥 **HLS Video Streaming Support** — Backend ready for HTTP Live Streaming playback
- ⚡ **Real-time Interactions** — Live comments, likes, and emoji reactions powered by Socket.IO
- 💬 **Live Comments System** — Users can post comments that are instantly broadcast to viewers
- ❤️ **Stream Likes** — Users can like streams with updates broadcast to the entire room
- 😀 **Emoji Reactions** — Lightweight reactions sent in real time without database writes
- 🔑 **JWT Authentication System** — Access tokens (1 day) with refresh tokens (30 days)
- 🛡️ **Route & Socket Protection** — REST routes protected via Express middleware; Socket.IO connections authenticated via a dedicated `io.use()` handshake middleware
- 🗄️ **MongoDB Data Persistence** — Stores users, streams, comments, and likes
- 🧩 **Modular Backend Architecture** — Organized controllers, routes, middleware, sockets, and models

---

## Overview

PocketPlay Server is the backend for a live video streaming platform. The server provides:

- **Google OAuth authentication**
- **REST APIs for discovering streams**
- **Real-time interactions powered by Socket.IO**

Viewers can **like streams, post comments, and send emoji reactions in real time** while watching a stream.

- **Comments and likes** are stored in **MongoDB**
- **Emoji reactions** are broadcast instantly and not persisted

Authentication uses **JWT with an access token (1 day) and a refresh token (30 days).** REST routes are protected with an Express `authentication` middleware, while Socket.IO connections are authenticated independently through an `io.use()` handshake middleware defined inside `socketService.js`.

---

## Tech Stack

| Layer     | Technology                         | Purpose                                      |
| --------- | ----------------------------------- | -------------------------------------------- |
| Runtime   | Node.js 22                         | JavaScript runtime                           |
| Framework | Express 5                          | HTTP server & routing                        |
| Database  | MongoDB + Mongoose 9               | Data persistence & ODM                       |
| Realtime  | Socket.IO 4                        | WebSocket communication                      |
| Auth      | jsonwebtoken + google-auth-library | Token signing & Google ID token verification |
| Utilities | http-status-codes, dotenv          | Status constants, environment config         |
| Dev       | nodemon                            | Auto-reload in development                   |

---

## Getting Started

**1. Clone and install**

```bash
git clone https://github.com/krishnakmr08/PocketPlay-Server.git
cd PocketPlay-Server
npm install
```

**2. Configure environment**

Create a `.env` file in the project root:

```env
MONGO_URI=your_mongodb_connection_string
GOOGLE_CLIENT_ID=your_google_client_id

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d

REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=30d
```

**3. Run**

```bash
npm run dev    # development — nodemon
npm start      # production
```

---

## Project Structure

```
pocketplay-server/
│
├── config/
│   └── connectDB.js           # Mongoose connection
│
├── controllers/
│   ├── auth.js                # signInWithGoogle, refreshToken
│   └── play.js                # getPlays
│
├── errors/
│   ├── custom-api.js          # Base CustomAPIError
│   ├── bad-request.js         # 400
│   ├── unauthenticated.js     # 401
│   ├── not-found.js           # 404
│   └── index.js               # Barrel export
│
├── hls/
│   ├── output.m3u8            # HLS playlist
│   ├── output0.ts             # Video segment
│   └── sample.mp4             # Source media
│
├── middleware/
│   ├── authentication.js      # JWT verification (REST routes only)
│   ├── error-handler.js       # Global error middleware
│   └── not-found.js           # 404 fallback
│
├── models/
│   ├── User.js                # User schema + token methods
│   └── Play.js                # Stream schema
│
├── routes/
│   ├── auth.js                # /auth/login, /auth/refresh-token
│   └── play.js                # /play/list
│
├── sockets/
│   └── socketService.js       # Socket.IO server setup, inline JWT handshake auth & event handlers
│
├── app.js
├── seedData.js
└── package.json
```

---

## API Reference

### `POST /auth/login`

Verifies a Google ID token. Registers the user on first sign-in with a unique username auto-generated from their Google display name. Returns both tokens on success.

**Request**

```json
{ "id_token": "google_id_token" }
```

**Response — existing user `200`, new user `201`**

```json
{
  "user": {
    "_id": "...",
    "name": "...",
    "username": "...",
    "email": "...",
    "picture": "..."
  },
  "tokens": {
    "access_token": "<jwt · expires 1d>",
    "refresh_token": "<jwt · expires 30d>"
  }
}
```

---

### `POST /auth/refresh-token`

Verifies the refresh token and issues a new token pair.

**Request**

```json
{ "refresh_token": "..." }
```

**Response `200`**

```json
{
  "access_token": "...",
  "refresh_token": "..."
}
```

---

### `GET /play/list`

Returns four curated lists from the database. No auth required.

**Response `200`**

```json
{
  "live":        [...],
  "top_liked":   [...],
  "top_starred": [...],
  "top_rated":   [...]
}
```

Each play object: `_id · title · description · likes · rating · starred · thumbnail_url · stream_url · genre`

---

## Authentication

There are two independent JWT verification paths, one for HTTP and one for Socket.IO:

### REST — `middleware/authentication.js`

Express middleware attached to protected routes. It reads the `Authorization: Bearer <token>` header, verifies the access token, loads the user, and attaches `req.user`.

```javascript
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

  const user = await User.findById(payload.id);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  req.user = {
    id: payload.id,
  };

  next();
};

export default authMiddleWare;
```

Missing or invalid tokens throw an `UnauthenticatedError` (`401`); a valid token but unknown user throws a `NotFoundError` (`404`).

### Socket.IO — inline `io.use()` in `sockets/socketService.js`

Socket connections are **not** authenticated by the REST `authentication` middleware. Instead, `socketService.js` registers its own handshake middleware directly on the `io` instance, reading the token from `socket.handshake.auth.token`, verifying it, loading the user, and attaching `socket.user`:

```javascript
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
```

Any connection that fails this check never reaches `io.on("connection", ...)` — Socket.IO rejects it during the handshake.

---

## Socket.IO

All Socket.IO logic now lives in `sockets/socketService.js`, which initializes the Socket.IO server, applies its own inline `io.use()` handshake authentication (see [Authentication](#authentication) above), and registers all real-time event handlers.

All socket connections are authenticated using JWT.
The client sends the token using `socket.handshake.auth.token`.
After verification, the server attaches the user information to the socket.

**Client → Server**

| Event           | Payload                | Description                                         |
| --------------- | ----------------------- | ---------------------------------------------------- |
| `join-stream`   | `{ playId }`            | Join a stream room                                  |
| `get-play-info` | `{ playId }`            | Get stream information for the current user         |
| `like-play`     | `{ playId }`            | Like a stream and update the like count             |
| `new-comment`   | `{ playId, comment }`   | Add a comment to the stream                         |
| `send-reaction` | `{ playId, reaction }`  | Send an emoji reaction (not stored in the database)  |

**Server → Client**

| Event              | Description                            |
| ------------------- | --------------------------------------- |
| `stream-play-info` | Stream details for the requesting user |
| `stream-likes`     | Updated like count                     |
| `stream-comments`  | Updated comments list                  |
| `stream-reactions` | Emoji reactions from viewers           |
| `socket-error`     | Error message                          |

### Flow

```
Client joins a stream
        │
        ▼
socket.emit("join-stream", { playId })

Server validates the stream
        │
        ▼
socket.join(playId)
```

**Real-time interactions:**

```
like-play      → update DB → broadcast updated likes
new-comment    → update DB → broadcast updated comments
send-reaction  → broadcast emoji reaction
get-play-info  → read DB   → send stream data to user
```

---

## Error Handling

Custom error classes extend a base `CustomAPIError` and carry their own HTTP status. The global error middleware catches all thrown errors and returns a consistent response shape.

```
CustomAPIError
├── BadRequestError      → 400
├── UnauthenticatedError → 401
└── NotFoundError        → 404
```

```json
{ "message": "..." }
```

---

## Data Models

### User

| Field       | Type   | Notes                                      |
| ----------- | ------ | ------------------------------------------ |
| `name`      | String | required                                   |
| `email`     | String | required, unique                           |
| `picture`   | String | —                                          |
| `username`  | String | required, unique, `/^[a-zA-Z0-9_]{3,30}$/` |
| `createdAt` | Date   | auto                                       |
| `updatedAt` | Date   | auto                                       |

Token generation is encapsulated as schema instance methods (`createAccessToken`, `createRefreshToken`) — no signing logic leaks into controllers.

---

## Architecture

```
Client (Mobile App / Web App)
        │
        ├── HTTP ───────────────────────────────► Express REST API
        │                                          │
        │                                          ├── POST /auth/login
        │                                          │       verify Google ID token
        │                                          │       create user if not exists
        │                                          │       return access + refresh tokens
        │                                          │
        │                                          ├── POST /auth/refresh-token
        │                                          │       verify refresh token
        │                                          │       return new token pair
        │                                          │
        │                                          └── GET /play/list
        │                                                  live · top liked · starred · rated
        │
        └── WebSocket ───────────────────────────► sockets/socketService.js
                                                   │
                                     io.use() handshake auth
                                     (socket.handshake.auth.token)
                                                   │
                              ┌────────────────────┼─────────────────────┐
                              │                    │                     │
                        join-stream           like-play            send-reaction
                        get-play-info         new-comment
                              │                    │                     │
                         reads DB            writes DB            broadcast only
                              │                    │              (no DB write)
                              └────────────────────┘
                                              │
                                     MongoDB Database
                                              │
                       ┌──────────────────────┼──────────────────────┐
                       │                      │                      │
                    Users                   Plays              Comments & Likes
               (Google login)       (stream metadata)        (persisted via socket)
```

---

## Future Improvements

- [ ] **Redis adapter** — replace in-memory Socket.IO rooms with Redis pub/sub for horizontal scaling across multiple server instances
- [ ] **Refresh token revocation** — persist issued refresh tokens and invalidate on logout or detected reuse
- [ ] **Rate limiting** — protect auth endpoints and socket events from abuse
- [ ] **Push notifications** — alert followers when a stream goes live
- [ ] **Pagination** — cursor-based pagination on `/play/list` instead of a fixed limit of 10
- [ ] **View count** — increment a counter on `join-stream` to track concurrent and total viewers

---

## License

This project is licensed under the ISC License.

---

## Author

**Krishna Kumar** — [github.com/krishnakmr08](https://github.com/krishnakmr08)