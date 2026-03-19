import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json(
        {
          error: "Invalid violation ID",
          details: parsedParams.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { id: violationId } = parsedParams.data;

    const client = await pool.connect();
    try {
      const violationCheck = await client.query(
        "SELECT id FROM violations WHERE id = $1",
        [violationId],
      );

      if (violationCheck.rowCount === 0) {
        return NextResponse.json(
          { error: "Violation not found" },
          { status: 404 },
        );
      }

      const formData = await request.formData();
      const file = formData.get("photo");

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: "No photo file provided" },
          { status: 400 },
        );
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            error:
              "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.",
          },
          { status: 400 },
        );
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "File size exceeds 10MB limit" },
          { status: 400 },
        );
      }

      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blobPath = `violations/${violationId}/photos/${timestamp}-${sanitizedFileName}`;

      const blob = await put(blobPath, file, {
        access: "public",
        contentType: file.type,
      });

      const insertResult = await client.query(
        `INSERT INTO violation_photos (violation_id, url, filename, content_type, size, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, violation_id, url, filename, content_type, size, created_at`,
        [violationId, blob.url, file.name, file.type, file.size],
      );

      const photoRecord = insertResult.rows[0];

      return NextResponse.json(photoRecord, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error uploading violation photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
