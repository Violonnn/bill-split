/**
 * Database setup script - aligns MongoDB with BillSplit models.
 * Run: node scripts/setup-db.js
 *
 * - Connects to MongoDB
 * - Registers all models (creates collections if missing)
 * - Syncs indexes (unique, sparse, etc.)
 * - Optionally seeds a test bill for development
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function setup() {
  if (!process.env.MONGO_URI) {
    console.error('Error: MONGO_URI is not set in server/.env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.\n');

    // Import models - this registers them with Mongoose and creates collections
    const User = (await import('../models/User.js')).default;
    const Bill = (await import('../models/Bill.js')).default;
    const Invitation = (await import('../models/Invitation.js')).default;

    // Drop conflicting nickname index if it exists (may be non-unique from prior schema)
    try {
      await User.collection.dropIndex('nickname_1');
      console.log('Dropped old nickname index (will recreate as unique).');
    } catch {
      // Index may not exist - syncIndexes will create it
    }

    // Sync indexes (creates unique, sparse indexes from schema)
    console.log('Syncing indexes...');
    await User.syncIndexes();
    await Bill.syncIndexes();
    await Invitation.syncIndexes();
    console.log('Indexes synced.\n');

    // Seed a test bill for development (optional - only if none exist)
    const billCount = await Bill.countDocuments();
    if (billCount === 0 && process.env.SEED_DEMO === 'true') {
      console.log('Seeding demo bill (SEED_DEMO=true)...');
      const crypto = await import('crypto');
      const code = crypto.randomBytes(6).toString('hex').toUpperCase();
      await Bill.create({
        title: 'Demo Bill - Test',
        createdBy: new mongoose.Types.ObjectId(),
        participants: [],
        invitationCode: code,
      });
      console.log(`Demo bill created. Invitation code: ${code}`);
      console.log('Use this code to test the guest join flow.\n');
    } else if (billCount === 0) {
      console.log('Tip: Set SEED_DEMO=true in .env and re-run to seed a test bill.');
    }

    console.log('Database setup complete.');
    console.log('Collections: users, bills, invitations');
  } catch (err) {
    console.error('Setup failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected.');
    process.exit(0);
  }
}

setup();
