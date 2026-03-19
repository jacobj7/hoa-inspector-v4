import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (\!session || \!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role \!== "manager") {
      return NextResponse.json(
        { error: "Forbidden: Manager role required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const validStatuses = ["open", "in_review", "resolved", "closed"];

    // Build status summary
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
    const statusSummary = validStatuses.map((s) => ({
      status: s,
      count: totals[s] as number,
    }));

    // Build per-property list with optional status filter
    let propertiesQuery: string;
    let propertiesParams: any[];

    if (statusFilter && validStatuses.includes(statusFilter)) {
      propertiesQuery = `
        SELECT
          p.id AS property_id,
          COALESCE(p.name, p.address) AS property_name,
          p.address,
          COUNT(v.id)::int AS violation_count
        FROM properties p
        LEFT JOIN violations v ON v.property_id = p.id AND v.status = $1
        GROUP BY p.id, p.name, p.address
        ORDER BY p.address ASC`;
      propertiesParams = [statusFilter];
    } else {
      propertiesQuery = `
        SELECT
          p.id AS property_id,
          COALESCE(p.name, p.address) AS property_name,
          p.address,
          COUNT(v.id)::int AS violation_count
        FROM properties p
        LEFT JOIN violations v ON v.property_id = p.id
        GROUP BY p.id, p.name, p.address
        ORDER BY p.address ASC`;
      propertiesParams = [];
    }

    const propertiesResult = await query(propertiesQuery, propertiesParams);

    const properties = propertiesResult.rows.map((row) => ({
      property_id: row.property_id,
      property_name: row.property_name,
      address: row.address,
      violation_count: row.violation_count,
    }));

    return NextResponse.json({ statusSummary, properties });
  } catch (error) {
    console.error("Error fetching violations summary:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
