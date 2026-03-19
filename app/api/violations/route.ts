import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createViolationSchema = z.object({
  property_id: z.number().int().positive(),
  type: z.string().min(1).max(255),
  description: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  inspection_round_id: z.number().int().positive().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (!userRole || !["inspector", "manager"].includes(userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const property_id = searchParams.get("property_id");

  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`v.status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }

  if (property_id) {
    const parsedPropertyId = parseInt(property_id, 10);
    if (isNaN(parsedPropertyId)) {
      return NextResponse.json(
        { error: "Invalid property_id" },
        { status: 400 },
      );
    }
    conditions.push(`v.property_id = $${paramIndex}`);
    values.push(parsedPropertyId);
    paramIndex++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT
      v.id,
      v.property_id,
      v.type,
      v.description,
      v.severity,
      v.status,
      v.inspection_round_id,
      v.reported_by,
      v.created_at,
      v.updated_at,
      p.address AS property_address,
      u.name AS reporter_name
    FROM violations v
    LEFT JOIN properties p ON v.property_id = p.id
    LEFT JOIN users u ON v.reported_by = u.id
    ${whereClause}
    ORDER BY v.created_at DESC
  `;

  const client = await pool.connect();
  try {
    const result = await client.query(query, values);
    return NextResponse.json({ violations: result.rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching violations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (!userRole || !["inspector", "manager"].includes(userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id?: string | number }).id;
  if (!userId) {
    return NextResponse.json(
      { error: "User ID not found in session" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = createViolationSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { property_id, type, description, severity, inspection_round_id } =
    parseResult.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertViolationQuery = `
      INSERT INTO violations (property_id, type, description, severity, inspection_round_id, reported_by, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'open', NOW(), NOW())
      RETURNING id, property_id, type, description, severity, status, inspection_round_id, reported_by, created_at, updated_at
    `;

    const violationResult = await client.query(insertViolationQuery, [
      property_id,
      type,
      description,
      severity,
      inspection_round_id ?? null,
      userId,
    ]);

    const newViolation = violationResult.rows[0];

    const insertAuditLogQuery = `
      INSERT INTO violation_audit_log (violation_id, action, performed_by, details, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `;

    await client.query(insertAuditLogQuery, [
      newViolation.id,
      "created",
      userId,
      JSON.stringify({
        property_id,
        type,
        description,
        severity,
        inspection_round_id: inspection_round_id ?? null,
        status: "open",
      }),
    ]);

    await client.query("COMMIT");

    return NextResponse.json({ violation: newViolation }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating violation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
