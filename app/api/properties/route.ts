import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createPropertySchema = z.object({
  address: z.string().min(1, "Address is required"),
  owner_id: z.number().int().positive("Owner ID must be a positive integer"),
  lot_number: z.string().min(1, "Lot number is required"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT
          p.id,
          p.address,
          p.lot_number,
          p.owner_id,
          p.created_at,
          p.updated_at,
          u.name AS owner_name,
          u.email AS owner_email,
          COALESCE(v.open_violation_count, 0) AS open_violation_count
        FROM properties p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN (
          SELECT property_id, COUNT(*) AS open_violation_count
          FROM violations
          WHERE status = 'open'
          GROUP BY property_id
        ) v ON p.id = v.property_id
        ORDER BY p.created_at DESC
      `);

      return NextResponse.json({ properties: result.rows }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("GET /api/properties error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "manager") {
      return NextResponse.json(
        { error: "Forbidden: Manager role required" },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = createPropertySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { address, owner_id, lot_number } = parseResult.data;

    const client = await pool.connect();
    try {
      const ownerCheck = await client.query(
        "SELECT id FROM users WHERE id = $1",
        [owner_id],
      );
      if (ownerCheck.rowCount === 0) {
        return NextResponse.json({ error: "Owner not found" }, { status: 404 });
      }

      const result = await client.query(
        `INSERT INTO properties (address, owner_id, lot_number, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, address, owner_id, lot_number, created_at, updated_at`,
        [address, owner_id, lot_number],
      );

      return NextResponse.json({ property: result.rows[0] }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST /api/properties error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
