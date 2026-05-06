const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Tell fluent-ffmpeg where to find the FFmpeg program
// ffmpeg-static bundled the FFmpeg binary into your node_modules
// so we just point to it — no separate FFmpeg installation needed
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Compresses a video buffer using FFmpeg
 *
 * What this function receives:
 * - inputBuffer: the raw uploaded video as a Node.js Buffer
 * - originalName: the original filename like "movie.mp4"
 *
 * What this function returns:
 * - buffer: the compressed video as a Buffer
 * - size: the compressed file size in MB (we store this in the database)
 */
const compressVideo = (inputBuffer, originalName) => {
  // We return a Promise because FFmpeg runs asynchronously
  // The calling code can await this function and get the result
  return new Promise((resolve, reject) => {
    // Step 1 — Create paths for temporary files
    // FFmpeg needs actual file paths to work — it cannot
    // read directly from a JavaScript buffer
    // os.tmpdir() gives us the system temp folder:
    // Windows: C:\Users\YourName\AppData\Local\Temp
    // Mac/Linux: /tmp
    // We add a timestamp to prevent conflicts if two
    // uploads happen at the same time
    const tempInputPath = path.join(
      os.tmpdir(),
      `watchparty_input_${Date.now()}_${originalName}`,
    );

    const tempOutputPath = path.join(
      os.tmpdir(),
      `watchparty_output_${Date.now()}_${originalName}`,
    );

    // Step 2 — Write the uploaded buffer to the temp input file
    // Now FFmpeg can read it as a normal file
    fs.writeFileSync(tempInputPath, inputBuffer);

    console.log(`⚙️  Starting FFmpeg compression...`);
    console.log(
      `   Input: ${(inputBuffer.length / (1024 * 1024)).toFixed(2)}MB`,
    );

    // Step 3 — Run FFmpeg compression
    ffmpeg(tempInputPath)
      // VIDEO SETTINGS
      // libx264 is the most widely supported video codec
      // It produces H.264 video which plays on every device and browser
      .videoCodec("libx264")

      // CRF controls the quality vs file size tradeoff
      // 0 = perfect quality, huge file
      // 51 = terrible quality, tiny file
      // 28 is a sweet spot — noticeably smaller file, barely visible quality loss
      // If you want better quality use 23, for smaller files use 32
      .outputOptions("-crf 28")

      // Preset controls how long FFmpeg spends compressing
      // "fast" gives good compression without taking too long
      // Options from fastest to slowest:
      // ultrafast, superfast, veryfast, faster, fast, medium, slow, veryslow
      .outputOptions("-preset fast")

      // Scale the video to a maximum of 1280px wide (720p)
      // The -2 means FFmpeg calculates the height automatically
      // to maintain the original aspect ratio
      // This ensures no video above 720p gets uploaded
      .outputOptions("-vf scale=1280:-2")

      // AUDIO SETTINGS
      // AAC is the standard audio codec for MP4 files
      .audioCodec("aac")

      // 128k bitrate is good quality for movie audio
      // Good enough for voices, music and sound effects
      .audioBitrate("128k")

      // OUTPUT SETTINGS
      // Force MP4 output format — works on all browsers
      .format("mp4")

      // Where to write the compressed output file
      .output(tempOutputPath)

      // EVENTS
      // This runs when FFmpeg finishes successfully
      .on("end", () => {
        // Read the compressed file back as a buffer
        const compressedBuffer = fs.readFileSync(tempOutputPath);

        // Calculate the compressed size in MB
        const sizeInMB = compressedBuffer.length / (1024 * 1024);

        console.log(`✅ Compression done!`);
        console.log(`   Output: ${sizeInMB.toFixed(2)}MB`);

        // Clean up the temp files — we don't need them anymore
        // If we don't delete them they pile up and fill the server disk
        try {
          fs.unlinkSync(tempInputPath);
          fs.unlinkSync(tempOutputPath);
        } catch (cleanupError) {
          // Non-critical — just log if cleanup fails
          console.warn("Temp file cleanup warning:", cleanupError.message);
        }

        // Resolve the promise with the result
        resolve({
          buffer: compressedBuffer,
          // Round to 2 decimal places e.g. 12.57
          size: Math.round(sizeInMB * 100) / 100,
        });
      })

      // This runs if FFmpeg encounters an error
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);

        // Clean up temp files even when there is an error
        try {
          if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
          if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
        } catch (cleanupError) {
          console.warn("Temp file cleanup warning:", cleanupError.message);
        }

        // Reject the promise with the error
        reject(new Error("Video compression failed: " + err.message));
      })

      // Log FFmpeg progress as it runs
      // This shows in your server terminal during uploads
      .on("progress", (progress) => {
        if (progress.percent) {
          process.stdout.write(
            `\r   Compressing: ${Math.round(progress.percent)}%`,
          );
        }
      })

      // Start the FFmpeg process
      .run();
  });
};

module.exports = { compressVideo };
