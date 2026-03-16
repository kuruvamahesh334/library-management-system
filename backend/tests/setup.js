// ─────────────────────────────────────────────────────────────────────────────
// STEP 11a: TEST SETUP
// Industry use: Tests run against an in-memory MongoDB database.
// This means: No real data is touched. Tests are fast and isolated.
// ─────────────────────────────────────────────────────────────────────────────
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let mongoServer;

// Start in-memory MongoDB before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri   = mongoServer.getUri();
  process.env.MONGO_URI_TEST = uri;
  process.env.NODE_ENV       = "test";
  process.env.JWT_SECRET     = "test_secret_key_for_jest_tests";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.FINE_PER_DAY   = "10";
  process.env.MAX_BORROW_DAYS = "14";
  process.env.CORS_ORIGIN    = "http://localhost:3000";
  await mongoose.connect(uri);
});

// Clean up all collections between each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Stop MongoDB and close connection after all tests
afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});
