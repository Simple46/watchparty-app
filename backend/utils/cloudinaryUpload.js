const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

// Configure Cloudinary with your credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Converts a Buffer to a readable stream
 * Cloudinary's upload_stream needs a stream not a buffer
 * This helper converts between the two
 */
const bufferToStream = (buffer) => {
  const readable = new Readable({
    read() {
      this.push(buffer);
      this.push(null); // signals end of stream
    },
  });
  return readable;
};

/**
 * Uploads a file buffer to Cloudinary
 *
 * @param {Buffer} fileBuffer - The file as a Node.js Buffer
 * @param {string} fileName - Original filename e.g. "movie.mp4"
 * @param {string} folder - Cloudinary folder: "movies" or "thumbnails"
 * @param {string} resourceType - "video" for videos, "image" for thumbnails
 *
 * @returns {Promise<{publicId, cdnUrl}>}
 * publicId → Cloudinary's ID for this file (needed for deletion)
 * cdnUrl   → The direct public URL for streaming
 */
const uploadToCloudinary = (
  fileBuffer,
  fileName,
  folder = "watchparty/movies",
  resourceType = "video",
) => {
  return new Promise((resolve, reject) => {
    // Build a clean public ID from the filename
    // Cloudinary uses this as the file identifier
    const timestamp = Date.now();
    const cleanName = fileName
      .replace(/\.[^/.]+$/, "") // remove extension e.g. .mp4
      .replace(/[^a-zA-Z0-9]/g, "_") // replace special chars
      .toLowerCase();

    const publicId = `${folder}/${timestamp}_${cleanName}`;

    console.log(`📤 Uploading to Cloudinary: ${publicId}`);

    // upload_stream takes a stream and uploads it to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: resourceType,
        // chunk_size breaks the upload into chunks
        // This prevents timeouts on large video files
        chunk_size: 6000000, // 6MB chunks

        // eager: false means no transformations on upload
        // We already compressed with FFmpeg so no need
        eager_async: true,

        // overwrite: false means if same ID exists keep both
        overwrite: false,
      },
      // This callback runs when upload finishes or fails
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload failed:", error.message);
          reject(new Error("Cloudinary upload failed: " + error.message));
          return;
        }

        console.log(`✅ Cloudinary upload complete!`);
        console.log(`   URL: ${result.secure_url}`);

        resolve({
          // public_id is used for deletion
          publicId: result.public_id,
          // secure_url is the https URL to the file
          cdnUrl: result.secure_url,
        });
      },
    );

    // Pipe the buffer as a stream into the upload
    bufferToStream(fileBuffer).pipe(uploadStream);
  });
};

module.exports = { uploadToCloudinary, cloudinary };
