// config/database.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../utils/appUtils/logger.js';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useCreateIndex: true, // Deprecated in Mongoose 6+
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
