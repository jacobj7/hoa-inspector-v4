import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const result = await pool.query("SELECT * FROM properties WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const {
      address,
      city,
      state,
      zip_code,
      owner_name,
      owner_email,
      owner_phone,
    } = body;

    const result = await pool.query(
      `UPDATE properties 
       SET address = $1, city = $2, state = $3, zip_code = $4, 
           owner_name = $5, owner_email = $6, owner_phone = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        address,
        city,
        state,
        zip_code,
        owner_name,
        owner_email,
        owner_phone,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating property:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const result = await pool.query(
      "DELETE FROM properties WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Property deleted successfully" });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
