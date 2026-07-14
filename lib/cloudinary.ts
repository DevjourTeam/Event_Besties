import { v2 as cloudinary } from "cloudinary";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

type UploadResult = {
  secure_url: string;
  public_id: string;
};

function uploadStream(
  buffer: Buffer,
  options: Record<string, unknown>
): Promise<UploadResult> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      if (!result) return reject(new Error("Cloudinary upload returned no result"));
      resolve({ secure_url: result.secure_url, public_id: result.public_id });
    });
    stream.end(buffer);
  });
}

/**
 * Credentials for a browser-side upload straight to Cloudinary.
 *
 * The print PNG is far too big to POST through our own API: Vercel caps a
 * serverless request body at 4.5 MB and a 2400px print file base64-encodes well
 * past that, which the platform rejects with a plain-text 413. Signing here and
 * uploading from the browser keeps the API secret on the server while taking our
 * function out of the data path entirely.
 *
 * The signature must cover exactly the params the browser sends (minus file,
 * api_key and cloud_name), or Cloudinary rejects it as invalid.
 */
export function signUpload(params: Record<string, string | number>) {
  ensureConfigured();
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) throw new Error("Cloudinary is not configured");

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { ...params, timestamp },
    apiSecret
  );
  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY as string,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
  };
}

export function uploadSVG(buffer: Buffer, publicId: string): Promise<UploadResult> {
  return uploadStream(buffer, {
    resource_type: "raw",
    folder: "templates",
    public_id: publicId,
    format: "svg",
    overwrite: true,
  });
}

/**
 * A webfont for a template whose artwork uses a face Google doesn't host.
 * Raw resource: Cloudinary must serve the bytes untouched, and it sends
 * Access-Control-Allow-Origin: *, which a cross-origin @font-face requires.
 */
export function uploadFont(
  buffer: Buffer,
  publicId: string,
  ext: string
): Promise<UploadResult> {
  return uploadStream(buffer, {
    resource_type: "raw",
    folder: "fonts",
    public_id: `${publicId}.${ext}`,
    overwrite: true,
  });
}

export function uploadPNG(
  buffer: Buffer,
  folder: string,
  publicId: string
): Promise<UploadResult> {
  return uploadStream(buffer, {
    resource_type: "image",
    folder,
    public_id: publicId,
    format: "png",
    overwrite: true,
  });
}

export function uploadJPEG(
  buffer: Buffer,
  folder: string,
  publicId: string,
  opts?: { width?: number }
): Promise<UploadResult> {
  return uploadStream(buffer, {
    resource_type: "image",
    folder,
    public_id: publicId,
    format: "jpg",
    overwrite: true,
    quality: "auto:good",
    ...(opts?.width
      ? { transformation: [{ width: opts.width, crop: "scale" }] }
      : {}),
  });
}
