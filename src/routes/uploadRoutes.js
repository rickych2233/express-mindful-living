const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const router = express.Router();

// Pastikan folder uploads tersedia
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi Multer untuk menyimpan file asli terlebih dahulu
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const originalFilePath = req.file.path;
  const mimeType = req.file.mimetype;
  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");

  if (!isVideo && !isAudio) {
    // Jika bukan video/audio (misal gambar/pdf), langsung kembalikan nama filenya
    return res.json({
      message: "File uploaded successfully",
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/${req.file.filename}`
    });
  }

  // Siapkan nama file output kompresi
  const compressedFilename = "compressed-" + req.file.filename;
  const compressedFilePath = path.join(uploadDir, compressedFilename);

  // Proses kompresi berjalan di latar belakang (background)
  // Kita kembalikan response 'processing' agar frontend tahu file sedang diolah
  res.status(202).json({
    message: "File uploaded and processing started",
    filename: compressedFilename, // Frontend akan menggunakan nama ini
    originalName: req.file.originalname,
    status: "processing",
    url: `/uploads/${compressedFilename}`
  });

  // Memulai proses FFmpeg
  const command = ffmpeg(originalFilePath);

  if (isVideo) {
    // Kompresi Video: Turunkan resolusi ke 720p jika lebih besar, gunakan codec h264
    command
      .videoCodec('libx264')
      .size('?x720') // Max height 720p
      .videoBitrate('1000k') // Kurangi bitrate
      .audioCodec('aac')
      .audioBitrate('128k')
      .outputOptions([
        '-crf 28', // Constant Rate Factor (kualitas, 28 = bagus untuk web)
        '-preset veryfast' // Mempercepat proses encoding
      ]);
  } else if (isAudio) {
    // Kompresi Audio: MP3 128kbps
    command
      .audioCodec('libmp3lame')
      .audioBitrate('128k');
  }

  command
    .save(compressedFilePath)
    .on('end', () => {
      console.log(`[Upload] Berhasil mengompresi ${req.file.filename} -> ${compressedFilename}`);
      // Opsional: Hapus file asli yang besar untuk menghemat space
      fs.unlink(originalFilePath, (err) => {
        if (err) console.error("Gagal menghapus file asli:", err);
      });
    })
    .on('error', (err) => {
      console.error(`[Upload] Error saat kompresi ${req.file.filename}:`, err);
      // Jika kompresi gagal, kita bisa biarkan file aslinya atau gunakan file aslinya sebagai fallback
      // Untuk fallback sederhana, ganti nama file asli menjadi compressedFilename
      fs.rename(originalFilePath, compressedFilePath, () => {});
    });
});

module.exports = router;
