import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'resident',
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        address TEXT NOT NULL,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lot_number VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inspection_rounds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        inspector_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        notes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS violations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        inspection_round_id UUID REFERENCES inspection_rounds(id) ON DELETE SET NULL,
        reported_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        severity VARCHAR(50) NOT NULL DEFAULT 'low',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS violation_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        sent_to UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        method VARCHAR(50) NOT NULL DEFAULT 'email',
        content TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        due_date TIMESTAMPTZ NOT NULL,
        paid_at TIMESTAMPTZ,
        status VARCHAR(50) NOT NULL DEFAULT 'unpaid'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS appeals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        reason TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS hearings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appeal_id UUID NOT NULL REFERENCES appeals(id) ON DELETE CASCADE,
        scheduled_at TIMESTAMPTZ NOT NULL,
        location TEXT NOT NULL,
        outcome VARCHAR(100),
        notes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS violation_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
        changed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        old_status VARCHAR(50),
        new_status VARCHAR(50),
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notes TEXT
      );
    `);

    await client.query("COMMIT");

    console.log("Migration completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed, rolling back:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
