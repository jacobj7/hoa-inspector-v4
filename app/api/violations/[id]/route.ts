import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed", "dismissed"]),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  if (!id || isNaN(Number(id))) {
    return NextResponse.json(
      { error: "Invalid violation ID" },
      { status: 400 },
    );
  }

  const client = await pool.connect();
  try {
    const violationResult = await client.query(
      `SELECT
        v.id,
        v.title,
        v.description,
        v.status,
        v.severity,
        v.location,
        v.reported_by,
        v.assigned_to,
        v.created_at,
        v.updated_at,
        u_reporter.name AS reporter_name,
        u_reporter.email AS reporter_email,
        u_assignee.name AS assignee_name,
        u_assignee.email AS assignee_email
      FROM violations v
      LEFT JOIN users u_reporter ON v.reported_by = u_reporter.id
      LEFT JOIN users u_assignee ON v.assigned_to = u_assignee.id
      WHERE v.id = $1`,
      [id],
    );

    if (violationResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const violation = violationResult.rows[0];

    const photosResult = await client.query(
      `SELECT id, url, caption, uploaded_by, created_at
       FROM violation_photos
       WHERE violation_id = $1
       ORDER BY created_at ASC`,
      [id],
    );

    const noticesResult = await client.query(
      `SELECT
        n.id,
        n.title,
        n.content,
        n.sent_at,
        n.sent_by,
        u.name AS sent_by_name
       FROM violation_notices n
       LEFT JOIN users u ON n.sent_by = u.id
       WHERE n.violation_id = $1
       ORDER BY n.sent_at DESC`,
      [id],
    );

    const finesResult = await client.query(
      `SELECT
        f.id,
        f.amount,
        f.currency,
        f.status AS fine_status,
        f.due_date,
        f.paid_at,
        f.issued_by,
        f.created_at,
        u.name AS issued_by_name
       FROM violation_fines f
       LEFT JOIN users u ON f.issued_by = u.id
       WHERE f.violation_id = $1
       ORDER BY f.created_at DESC`,
      [id],
    );

    const auditResult = await client.query(
      `SELECT
        a.id,
        a.old_status,
        a.new_status,
        a.notes,
        a.changed_by,
        a.changed_at,
        u.name AS changed_by_name
       FROM violation_audit_log a
       LEFT JOIN users u ON a.changed_by = u.id
       WHERE a.violation_id = $1
       ORDER BY a.changed_at DESC`,
      [id],
    );

    return NextResponse.json({
      violation: {
        ...violation,
        photos: photosResult.rows,
        notices: noticesResult.rows,
        fines: finesResult.rows,
        audit_log: auditResult.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching violation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "manager" && userRole !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Manager role required" },
      { status: 403 },
    );
  }

  const { id } = params;

  if (!id || isNaN(Number(id))) {
    return NextResponse.json(
      { error: "Invalid violation ID" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = PatchSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { status: newStatus, notes } = parseResult.data;
  const userId = (session.user as { id?: string })?.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT id, status FROM violations WHERE id = $1 FOR UPDATE`,
      [id],
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Violation not found" },
        { status: 404 },
      );
    }

    const oldStatus = existingResult.rows[0].status;

    const updateResult = await client.query(
      `UPDATE violations
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, title, status, updated_at`,
      [newStatus, id],
    );

    await client.query(
      `INSERT INTO violation_audit_log
        (violation_id, old_status, new_status, notes, changed_by, changed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, oldStatus, newStatus, notes ?? null, userId ?? null],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      violation: updateResult.rows[0],
      audit: {
        old_status: oldStatus,
        new_status: newStatus,
        notes: notes ?? null,
        changed_by: userId,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating violation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
