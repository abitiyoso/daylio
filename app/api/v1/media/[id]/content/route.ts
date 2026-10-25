import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { identity, sameOrigin } from "../../../../../../lib/auth";
import { scoped, type DB } from "../../../../../../lib/db";
import { verifyMediaGrant } from "../../../../../../lib/media.mjs";
export const runtime = "nodejs";
async function handler(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const user = await identity(request);
    const id = z.uuid().parse((await params).id),
      url = new URL(request.url);
    const org = z
      .uuid()
      .parse(
        request.method === "GET"
          ? url.searchParams.get("org")
          : request.headers.get("x-organization-id"),
      );
    if (
      request.method === "GET" &&
      !verifyMediaGrant(
        id,
        org,
        user.id,
        url.searchParams.get("expires") || "",
        url.searchParams.get("sig") || "",
      )
    )
      return Response.json(
        {
          error: {
            code: "MEDIA_ERROR",
            requestId: crypto.randomUUID(),
            message: "Tautan media kedaluwarsa",
          },
        },
        { status: 403 },
      );
    return await scoped(user.id, org, async (tx: DB) => {
      const [row] =
        await tx`select * from records where id=${id} and organization_id=${org} and kind='media'`;
      if (!row)
        return Response.json(
          {
            error: {
              code: "MEDIA_ERROR",
              requestId: crypto.randomUUID(),
              message: "Media tidak ditemukan",
            },
          },
          { status: 404 },
        );
      for (const childId of [
        ...new Set([row.child_id, ...(row.data.depictedChildIds || [])]),
      ]) {
        const [{ allowed }] =
          await tx`select media_consent(${childId}) allowed`;
        if (!allowed)
          return Response.json(
            {
              error: {
                code: "MEDIA_CONSENT_REQUIRED",
                message: "Persetujuan foto belum tersedia atau telah dicabut.",
              },
            },
            { status: 403, headers: { "Cache-Control": "no-store" } },
          );
      }
      const directory = resolve(
        process.env.MEDIA_DIRECTORY || "data/media",
        org,
      );
      const filename = resolve(directory, id + ".webp");
      if (request.method === "GET") {
        if (!row.data.uploaded)
          return Response.json(
            {
              error: {
                code: "MEDIA_ERROR",
                requestId: crypto.randomUUID(),
                message: "Unggahan belum selesai",
              },
            },
            { status: 409 },
          );
        await tx`insert into audit_logs(organization_id,actor_id,action,resource_id) values(${org},${user.id},'media.download',${id})`;
        const bytes = await readFile(filename);
        return new Response(bytes, {
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
          },
        });
      }
      const [{ role }] = await tx`select app_role() role`;
      if (
        !["owner", "manager", "caregiver"].includes(role) ||
        (role === "caregiver" && row.created_by !== user.id)
      )
        return Response.json(
          {
            error: {
              code: "MEDIA_ERROR",
              requestId: crypto.randomUUID(),
              message: "Akses ditolak",
            },
          },
          { status: 403 },
        );
      if (row.data.uploaded)
        return Response.json(
          {
            error: {
              code: "MEDIA_ERROR",
              requestId: crypto.randomUUID(),
              message: "Media sudah diunggah",
            },
          },
          { status: 409 },
        );
      const declared = Number(request.headers.get("content-length"));
      if (declared > 5242880)
        return Response.json(
          {
            error: {
              code: "MEDIA_ERROR",
              requestId: crypto.randomUUID(),
              message: "Batas foto 5 MB",
            },
          },
          { status: 413 },
        );
      if (request.headers.get("content-type") !== row.data.mime)
        return Response.json(
          {
            error: {
              code: "MEDIA_ERROR",
              requestId: crypto.randomUUID(),
              message: "Tipe media tidak sesuai",
            },
          },
          { status: 422 },
        );
      const reader = request.body?.getReader();
      if (!reader)
        return Response.json(
          {
            error: {
              code: "MEDIA_ERROR",
              requestId: crypto.randomUUID(),
              message: "Foto diperlukan",
            },
          },
          { status: 422 },
        );
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > 5242880) {
          await reader.cancel();
          return Response.json(
            {
              error: {
                code: "MEDIA_ERROR",
                requestId: crypto.randomUUID(),
                message: "Batas foto 5 MB",
              },
            },
            { status: 413 },
          );
        }
        chunks.push(value);
      }
      if (total !== row.data.size)
        return Response.json(
          {
            error: {
              code: "MEDIA_ERROR",
              requestId: crypto.randomUUID(),
              message: "Ukuran foto tidak sesuai",
            },
          },
          { status: 422 },
        );
      const source = Buffer.concat(chunks),
        image = sharp(source, { limitInputPixels: 25000000, animated: false });
      const metadata = await image.metadata();
      if (
        !["jpeg", "png", "webp"].includes(metadata.format || "") ||
        `image/${metadata.format}` !== row.data.mime
      )
        return Response.json(
          {
            error: {
              code: "MEDIA_ERROR",
              requestId: crypto.randomUUID(),
              message: "Format foto tidak sesuai",
            },
          },
          { status: 422 },
        );
      const bytes = await image
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer();
      await mkdir(directory, { recursive: true });
      const temp = filename + "." + crypto.randomUUID() + ".tmp";
      await writeFile(temp, bytes, { flag: "wx" });
      await rename(temp, filename);
      await tx`update records set data=data || '{"uploaded":true}'::jsonb where id=${id} and organization_id=${org}`;
      await tx`insert into audit_logs(organization_id,actor_id,action,resource_id) values(${org},${user.id},'media.upload',${id})`;
      return Response.json({ data: { id, uploaded: true } });
    });
  } catch (error: any) {
    return Response.json(
      {
        error: {
          code: "MEDIA_ERROR",
          requestId: crypto.randomUUID(),
          message:
            error.status === 401 ? "Silakan masuk" : "Media tidak tersedia",
        },
      },
      { status: error.status || 422 },
    );
  }
}
export { handler as GET, handler as PUT };
