const Chapter = require("../models/Chapter");

class ChapterController {
  static async createChapter(req, res) {
    try {
      const { title, description, status } = req.body;

      if (!title || !description) {
        return res.status(400).json({
          message: "title dan description harus diisi",
        });
      }

      const newChapter = await Chapter.create({
        title,
        description,
        status,
      });

      return res.status(201).json({
        message: "chapter berhasil dibuat",
        chapter: newChapter,
      });
    } catch (error) {
      console.error("CREATE_CHAPTER_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async getAllChapters(req, res) {
    try {
      const chapters = await Chapter.findAll();

      return res.status(200).json({
        message: "data chapters berhasil diambil",
        chapters,
      });
    } catch (error) {
      console.error("GET_CHAPTERS_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async getChapterById(req, res) {
    try {
      const { id } = req.params;

      const chapter = await Chapter.findById(id);

      if (!chapter) {
        return res.status(404).json({
          message: "chapter tidak ditemukan",
        });
      }

      return res.status(200).json({
        message: "data chapter berhasil diambil",
        chapter,
      });
    } catch (error) {
      console.error("GET_CHAPTER_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async updateChapter(req, res) {
    try {
      const { id } = req.params;
      const { title, description, status } = req.body;

      if (!title || !description) {
        return res.status(400).json({
          message: "title dan description harus diisi",
        });
      }

      const existingChapter = await Chapter.findById(id);
      if (!existingChapter) {
        return res.status(404).json({
          message: "chapter tidak ditemukan",
        });
      }

      const updatedChapter = await Chapter.update(id, {
        title,
        description,
        status: status || existingChapter.status,
      });

      return res.status(200).json({
        message: "chapter berhasil diupdate",
        chapter: updatedChapter,
      });
    } catch (error) {
      console.error("UPDATE_CHAPTER_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async deleteChapter(req, res) {
    try {
      const { id } = req.params;

      const deletedChapter = await Chapter.delete(id);

      if (!deletedChapter) {
        return res.status(404).json({
          message: "chapter tidak ditemukan",
        });
      }

      return res.status(200).json({
        message: "chapter berhasil dihapus",
      });
    } catch (error) {
      console.error("DELETE_CHAPTER_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async toggleChapterStatus(req, res) {
    try {
      const { id } = req.params;

      const chapter = await Chapter.findById(id);
      if (!chapter) {
        return res.status(404).json({
          message: "chapter tidak ditemukan",
        });
      }

      const updatedChapter = await Chapter.toggleStatus(id);

      return res.status(200).json({
        message: `status chapter berhasil diubah menjadi ${updatedChapter.status}`,
        chapter: updatedChapter,
      });
    } catch (error) {
      console.error("TOGGLE_CHAPTER_STATUS_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async setChapterStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          message: "status harus diisi (Published/Drafted)",
        });
      }

      const chapter = await Chapter.findById(id);
      if (!chapter) {
        return res.status(404).json({
          message: "chapter tidak ditemukan",
        });
      }

      const updatedChapter = await Chapter.setStatus(id, status);

      return res.status(200).json({
        message: `status chapter berhasil diubah menjadi ${updatedChapter.status}`,
        chapter: updatedChapter,
      });
    } catch (error) {
      console.error("SET_CHAPTER_STATUS_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }
}

module.exports = ChapterController;
