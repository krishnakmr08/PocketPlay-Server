import mongoose from "mongoose";

const { Schema } = mongoose;

const commentSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  comment: {
    type: String,
    required: true,
    trim: true,
  },

  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const playSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    genre: {
      type: String,
      trim: true,
    },

    likes: {
      type: Number,
      default: 0,
    },

    starred: {
      type: Number,
      default: 0,
    },

    rating: {
      type: Number,
      min: 0,
      max: 10,
    },

    liked_by: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    starred_by: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    comments: [commentSchema],

    thumbnail_url: {
      type: String,
      required: true,
    },

    stream_url: {
      type: String,
    },

    is_live: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Play = mongoose.model("Play", playSchema);

export default Play;
