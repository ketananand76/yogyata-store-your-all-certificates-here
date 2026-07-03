require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Alert = require('./models/Alert');
const { blockUserAndAlert } = require('./controllers/socialController');

async function run() {
  await connectDB();
  console.log('DB connected');

  // Find a test user (e.g. Ketan or any user)
  const testUser = await User.findOne({});
  if (!testUser) {
    console.log('No user found in database to test blockUserAndAlert');
    process.exit(0);
  }

  console.log(`Found test user: ${testUser.name} (${testUser.email})`);
  
  // Back up original status
  const originalStatus = testUser.status;
  console.log(`Original status: ${originalStatus}`);

  try {
    console.log('Executing blockUserAndAlert...');
    const alert = await blockUserAndAlert(testUser._id, 'Testing blockUserAndAlert system log.');
    if (alert) {
      console.log('SUCCESS: Alert created!', alert);
    } else {
      console.log('FAILURE: blockUserAndAlert returned null!');
    }
  } catch (err) {
    console.error('CRITICAL RUNTIME EXCEPTION:', err);
  }

  // Restore user status to original
  testUser.status = originalStatus;
  await testUser.save();
  console.log('Restored original status of test user.');

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
