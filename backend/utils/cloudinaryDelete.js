const { cloudinary } = require("./cloudinaryUpload");

/**
 * Deletes a file from Cloudinary
 *
 * @param {string} publicId - The public_id returned when you uploaded
 * @param {string} resourceType - "video" for videos, "image" for thumbnails
 *
 * @returns {Promise<boolean>}
 */
const deleteFromCloudinary = async (publicId, resourceType = "video") => {
  try {
    console.log(`🗑️  Deleting from Cloudinary: ${publicId}`);

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    // Cloudinary returns "ok" if deletion was successful
    // "not found" means file was already deleted or ID is wrong
    if (result.result === "ok") {
      console.log(`✅ Deleted from Cloudinary: ${publicId}`);
      return true;
    } else if (result.result === "not found") {
      // File was already gone — not a critical error
      // We still want to remove it from our database
      console.warn(`⚠️  File not found in Cloudinary: ${publicId}`);
      return true;
    } else {
      throw new Error(`Cloudinary deletion returned: ${result.result}`);
    }
  } catch (error) {
    console.error("❌ Cloudinary delete failed:", error.message);
    throw new Error("Failed to delete from Cloudinary: " + error.message);
  }
};

module.exports = { deleteFromCloudinary };
