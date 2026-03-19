import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "manager") {
      return NextResponse.json(
        { error: "Forbidden: Manager role required" },
        { status: 403 },
      );
    }

    const totalsResult = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0)::int AS open,
        COALESCE(SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END), 0)::int AS in_review,
        COALESCE(SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END), 0)::int AS resolved,
        COALESCE(SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END), 0)::int AS closed
      FROM violations`,
      [],
    );

    const totals = totalsResult.rows[0];

    const perPropertyResult = await query(
      `SELECT
        p.id AS property_id,
        p.address AS property_address,
        COALESCE(SUM(CASE WHEN v.status = 'open' THEN 1 ELSE 0 END), 0)::int AS open,
        COALESCE(SUM(CASE WHEN v.status = 'in_review' THEN 1 ELSE 0 END), 0)::int AS in_review,
        COALESCE(SUM(CASE WHEN v.status = 'resolved' THEN 1 ELSE 0 END), 0)::int AS resolved,
        COALESCE(SUM(CASE WHEN v.status = 'closed' THEN 1 ELSE 0 END), 0)::int AS closed
      FROM properties p
      LEFT JOIN violations v ON v.property_id = p.id
      GROUP BY p.id, p.address
      ORDER BY p.address ASC`,
      [],
    );

    const perProperty = perPropertyResult.rows.map((row) => ({
      property_id: row.property_id,
      property_address: row.property_address,
      counts: {
        open: row.open,
        in_review: row.in_review,
        resolved: row.resolved,
        closed: row.closed,
      },
    }));

    return NextResponse.json({
      totals: {
        open: totals.open,
        in_review: totals.in_review,
        resolved: totals.resolved,
        closed: totals.closed,
      },
      per_property: perProperty,
    });
  } catch (error) {
    console.error("Error fetching violations summary:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
