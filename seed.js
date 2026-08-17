import "dotenv/config";
import mongoose from "mongoose";

import { connectDB } from "./config/connectDB.js";
import Play from "./models/Play.js";
import { contentData } from "./seedData.js";

const seedDB = async () => {
  try {
    await connectDB(process.env.MONGO_URI);

    await Play.deleteMany({});

    console.log("Cleared Play collection");

    await Play.insertMany(contentData);

    console.log("Play data seeded successfully!");

    await mongoose.connection.close();

    console.log("Database connection closed");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

seedDB();