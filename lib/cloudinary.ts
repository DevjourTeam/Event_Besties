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

export function uploadSVG(buffer: Buffer, publicId: string): Promise<UploadResult> {
  return uploadStream(buffer, {
    resource_type: "raw",
    folder: "templates",
    public_id: publicId,
    format: "svg",
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
