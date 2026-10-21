const Chapter = require("../models/Chapter");
const Section = require("../models/Section");

async function saveSections(chapterId, sections, status, client) {
  if (sections === undefined) return;
  if (!Array.isArray(sections)) {
    const error = new Error('sections harus berupa daftar'); error.status = 400; throw error;
  }
  for (const sec of sections) {
    if (!sec || typeof sec !== 'object') {
      const error = new Error('section tidak valid'); error.status = 400; throw error;
    }
    const title = typeof sec.title === 'string' ? { en: sec.title.trim() } : sec.title;
    if (!title || typeof title.en !== 'string' || !title.en.trim()) {
      const error = new Error('title section harus diisi'); error.status = 400; throw error;
    }
    if (sec.contents !== undefined && (!Array.isArray(sec.contents) || sec.contents.some(c => !c || typeof c !== 'object' || Array.isArray(c)))) {
      const error = new Error('contents harus berupa daftar lampiran'); error.status = 400; throw error;
    }
    const description = typeof sec.description === 'string' ? {en: sec.description} : (sec.description || {en:''});
    const content = typeof sec.content === 'string' ? {en: sec.content} : (sec.content || null);
    await Section.saveWithContents(sec.id || null, {chapter_id: chapterId, title, description, content,
      type: sec.type || 'Text', status}, sec.contents, chapterId, client);
  }
}

class ChapterController {
  static async createChapter(req, res) {
    try {
      const { title, description, status, thumbnail, sections } = req.body;
      
      console.log("CREATE_CHAPTER_PAYLOAD", { title, sections });

      if (!title || !description) {
        return res.status(400).json({
          message: "title dan description harus diisi",
        });
      }

      const newChapter = await Section.transaction(async client => {
        const chapter = await Chapter.create({title, description, status, thumbnail}, client);
        await saveSections(chapter.id, sections, status || 'Drafted', client);
        return chapter;
      });

      return res.status(201).json({
        message: "chapter berhasil dibuat",
        chapter: newChapter,
      });
    } catch (error) {
      console.error("CREATE_CHAPTER_ERROR", error);
      return res.status(error.status || 500).json({
        message: error.status ? error.message : "terjadi kesalahan server",
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
      const { title, description, status, thumbnail, sections } = req.body;
      
      console.log("UPDATE_CHAPTER_PAYLOAD", { id, sections });

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

      const updatedChapter = await Section.transaction(async client => {
        const chapter = await Chapter.update(id, {title, description,
          status: status || existingChapter.status, thumbnail}, client);
        await saveSections(chapter.id, sections, status || existingChapter.status, client);
        return chapter;
      });

      return res.status(200).json({
        message: "chapter berhasil diupdate",
        chapter: updatedChapter,
      });
    } catch (error) {
      console.error("UPDATE_CHAPTER_ERROR", error);
      return res.status(error.status || 500).json({
        message: error.status ? error.message : "terjadi kesalahan server",
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
  static async reorderChapters(req, res) {
    try {
      const { chapterIds } = req.body;
      
      if (!Array.isArray(chapterIds)) {
        return res.status(400).json({
          message: "chapterIds harus berupa array",
        });
      }

      await Chapter.reorder(chapterIds);

      return res.status(200).json({
        message: "Urutan chapter berhasil diperbarui",
      });
    } catch (error) {
      console.error("REORDER_CHAPTERS_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }
  static async reorderSections(req, res) {
    try {
      const { sectionIds } = req.body;
      
      if (!Array.isArray(sectionIds)) {
        return res.status(400).json({
          message: "sectionIds harus berupa array",
        });
      }

      const Section = require("../models/Section");
      await Section.reorder(sectionIds);

      return res.status(200).json({
        message: "Urutan section berhasil diperbarui",
      });
    } catch (error) {
      console.error("REORDER_SECTIONS_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }
}

module.exports = ChapterController;
