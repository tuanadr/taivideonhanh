import { sequelize } from '../src/config/database';
import { redis } from '../src/config/redis';

// Setup test environment
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.DB_NAME = 'taivideonhanh_test';
  
  // Connect to test database
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true }); // Reset database for tests
  } catch (error) {
    console.error('Database setup failed:', error);
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await sequelize.close();
    await redis.disconnect();
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
});

// Clear database between tests
beforeEach(async () => {
  try {
    await sequelize.sync({ force: true });
  } catch (error) {
    console.error('Database reset failed:', error);
  }
});
