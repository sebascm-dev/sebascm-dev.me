import sharp from "sharp";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Tipos de imagen que se suben tal cual: ya son webp, o perderían algo importante al convertirse
// (SVG es vectorial, GIF puede ser animado y sharp lo aplanaría a un frame)
const SKIP_WEBP_CONVERSION = new Set(["image/webp", "image/svg+xml", "image/gif"]);

// Sube un archivo y devuelve su URL pública y la key final (puede cambiar de extensión: ver abajo)
export async function uploadFile(file: Buffer, key: string, contentType: string): Promise<{ url: string; key: string }> {
  let body = file;
  let finalContentType = contentType;
  let finalKey = key;

  // Toda imagen que suba el admin (avatar, portadas, mockups) se convierte a webp antes de subirse
  if (contentType.startsWith("image/") && !SKIP_WEBP_CONVERSION.has(contentType)) {
    body = await sharp(file).webp({ quality: 82 }).toBuffer();
    finalContentType = "image/webp";
    finalKey = key.replace(/\.[^./]+$/, "") + ".webp";
  }

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: finalKey,
      Body: body,
      ContentType: finalContentType,
    })
  );

  return { url: `${process.env.R2_PUBLIC_URL}/${finalKey}`, key: finalKey };
}

// Lee un objeto directamente por la API de almacenamiento de R2 (no por el dominio público) —
// la usa la ruta /api/images para servir los archivos desde el propio dominio, sin pasar
// por las IPs anycast de Cloudflare (bloqueadas en España por LaLiga en el rango que le tocó a esta zona).
export async function getObject(key: string) {
  const result = await r2.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  );

  if (!result.Body) throw new Error(`Objeto sin contenido: ${key}`);

  return {
    // El SDK devuelve un stream de Node por defecto — se convierte al formato web que espera Response
    body: result.Body.transformToWebStream(),
    contentType: result.ContentType ?? "application/octet-stream",
    contentLength: result.ContentLength,
  };
}

// Elimina un archivo del bucket. Es limpieza best-effort en todos sus usos (reemplazar un
// archivo, borrar un proyecto): si R2 no responde, no debe bloquear la operación real —
// el objeto queda huérfano en el bucket, pero eso es preferible a no poder borrar nada.
export async function deleteFile(key: string): Promise<void> {
  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      })
    );
  } catch (err) {
    console.error('[deleteFile error] — el objeto queda huérfano en R2', key, err);
  }
}

// Genera una URL firmada para subida directa desde el cliente (útil a futuro)
export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 3600 }
  );
}
