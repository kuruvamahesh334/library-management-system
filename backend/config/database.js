const mongoose = require("mongoose");
const logger   = require("./logger");

const connectDB = async () => {
  const uri = process.env.NODE_ENV === "test"
    ? process.env.MONGO_URI_TEST
    : process.env.MONGO_URI;

  let retries = 5;
  while (retries > 0) {
    try {
      await mongoose.connect(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
      logger.info(`✅ MongoDB connected → ${mongoose.connection.name}`);
      mongoose.connection.on("disconnected", () => logger.warn("⚠️ MongoDB disconnected"));
      return;
    } catch (err) {
      retries--;
      logger.error(`MongoDB retry (${retries} left): ${err.message}`);
      if (retries === 0) { logger.error("MongoDB failed after 5 retries. Exiting."); process.exit(1); }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info("MongoDB connection closed.");
};

mongoose.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; },
});

module.exports = { connectDB, disconnectDB };
