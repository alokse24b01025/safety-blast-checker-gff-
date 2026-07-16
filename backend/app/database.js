import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blast_safety';

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Successfully connected to MongoDB: ${MONGODB_URI}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};
