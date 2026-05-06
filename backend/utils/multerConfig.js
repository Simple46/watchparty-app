const multer = require("multer");

// memoryStorage means uploaded files are kept as Buffers in RAM
// instead of being written to disk first
// This is perfect for our use case because we immediately
// pass the buffer to FFmpeg for compression then to Backblaze for upload
// We never need to save the original file to disk
const storage = multer.memoryStorage();

// ─────────────────────────────────────────
// VIDEO FILE FILTER
// Only accept actual video file types
// Reject anything else immediately
// ─────────────────────────────────────────
const videoFileFilter = (req, file, cb) => {
  // These are the MIME types for common video formats
  // The browser sends this along with the file
  const allowedVideoTypes = [
    "video/mp4", // .mp4
    "video/mpeg", // .mpeg
    "video/avi", // .avi
    "video/quicktime", // .mov
    "video/x-matroska", // .mkv
    "video/webm", // .webm
    "video/x-msvideo", // .avi alternative mime
    "video/3gpp", // .3gp
  ];

  if (allowedVideoTypes.includes(file.mimetype)) {
    // cb(error, acceptFile)
    // null means no error
    // true means accept this file
    cb(null, true);
  } else {
    // Reject with a clear error message
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Only video files are allowed.`,
      ),
      false,
    );
  }
};

// ─────────────────────────────────────────
// IMAGE FILE FILTER
// For thumbnail uploads
// ─────────────────────────────────────────
const imageFileFilter = (req, file, cb) => {
  const allowedImageTypes = [
    "image/jpeg", // .jpg, .jpeg
    "image/png", // .png
    "image/webp", // .webp
  ];

  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG or WebP images allowed.`,
      ),
      false,
    );
  }
};

// ─────────────────────────────────────────
// UPLOAD MOVIE FILES
// Handles both video and thumbnail in one request
// The admin uploads both files together from the upload form
// ─────────────────────────────────────────
const uploadMovieFiles = multer({
  storage: storage,

  // 500MB maximum file size
  // 500 * 1024 * 1024 converts MB to bytes
  limits: {
    fileSize: 500 * 1024 * 1024,
  },

  // Custom filter that checks based on the field name
  // "video" field → apply video filter
  // "thumbnail" field → apply image filter
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "video") {
      videoFileFilter(req, file, cb);
    } else if (file.fieldname === "thumbnail") {
      imageFileFilter(req, file, cb);
    } else {
      cb(new Error("Unexpected field: " + file.fieldname), false);
    }
  },
}).fields([
  // Define the expected fields
  // maxCount: 1 means only one file per field
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

module.exports = { uploadMovieFiles };
