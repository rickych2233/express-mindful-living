const Section = require("../models/Section");
const Chapter = require("../models/Chapter");

class SectionController {
  static async createSection(req, res) {
    try {
      const { chapterId } = req.params;
      const { title, description, type, status, content, contents } = req.body;

      let finalTitle = title;
      if (typeof title === "string") {
        finalTitle = { en: title.trim() };
      }

      if (!finalTitle || (typeof finalTitle === 'string' && finalTitle.trim() === '') || (typeof finalTitle === 'object' && (!finalTitle.en || finalTitle.en.trim() === ''))) {
        return res.status(400).json({
          message: "title harus diisi",
        });
      }

      let finalDescription = description || "";
      if (typeof finalDescription === "string") {
        finalDescription = finalDescription.trim() === "" ? { en: "" } : { en: finalDescription.trim() };
      }

      // Kolom content bertipe JSONB — string mentah harus dibungkus agar insert tidak gagal
      let finalContent = content || null;
      if (typeof finalContent === "string") {
        finalContent = finalContent.trim() === "" ? null : { en: finalContent.trim() };
      }

      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        return res.status(404).json({
          message: "chapter tidak ditemukan",
        });
      }

      const newSection = await Section.create({
        chapter_id: chapterId,
        title: finalTitle,
        description: finalDescription,
        content: finalContent,
        type: type || "Text",
        status: status || "Drafted",
      });

      if (Array.isArray(contents)) {
        newSection.contents = await Section.setContents(newSection.id, contents);
      }

      return res.status(201).json({
        message: "section berhasil dibuat",
        section: newSection,
      });
    } catch (error) {
      console.error("CREATE_SECTION_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async getSectionsByChapter(req, res) {
    try {
      const { chapterId } = req.params;

      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        return res.status(404).json({
          message: "chapter tidak ditemukan",
        });
      }

      const sections = await Section.findByChapterId(chapterId);

      return res.status(200).json({
        message: "data sections berhasil diambil",
        sections,
      });
    } catch (error) {
      console.error("GET_SECTIONS_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async updateSection(req, res) {
    try {
      const { id } = req.params;
      const { title, description, type, status, content, contents } = req.body;

      let finalTitle = title;
      if (typeof title === "string") {
        finalTitle = { en: title.trim() };
      }

      if (!finalTitle || (typeof finalTitle === 'string' && finalTitle.trim() === '') || (typeof finalTitle === 'object' && (!finalTitle.en || finalTitle.en.trim() === ''))) {
        return res.status(400).json({
          message: "title harus diisi",
        });
      }

      const existingSection = await Section.findById(id);
      if (!existingSection) {
        return res.status(404).json({
          message: "section tidak ditemukan",
        });
      }

      let finalDescription = description || existingSection.description;
      if (typeof finalDescription === "string") {
        finalDescription = finalDescription.trim() === "" ? { en: "" } : { en: finalDescription.trim() };
      }

      // Kolom content bertipe JSONB — string mentah harus dibungkus agar update tidak gagal
      let finalContent = content !== undefined ? content : existingSection.content;
      if (typeof finalContent === "string") {
        finalContent = finalContent.trim() === "" ? null : { en: finalContent.trim() };
      }

      const updatedSection = await Section.update(id, {
        title: finalTitle,
        description: finalDescription,
        content: finalContent,
        type: type || existingSection.type,
        status: status || existingSection.status,
      });

      if (Array.isArray(contents)) {
        updatedSection.contents = await Section.setContents(id, contents);
      }

      return res.status(200).json({
        message: "section berhasil diupdate",
        section: updatedSection,
      });
    } catch (error) {
      console.error("UPDATE_SECTION_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async deleteSection(req, res) {
    try {
      const { id } = req.params;

      const deletedSection = await Section.delete(id);

      if (!deletedSection) {
        return res.status(404).json({
          message: "section tidak ditemukan",
        });
      }

      return res.status(200).json({
        message: "section berhasil dihapus",
      });
    } catch (error) {
      console.error("DELETE_SECTION_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async toggleSectionStatus(req, res) {
    try {
      const { id } = req.params;

      const section = await Section.findById(id);
      if (!section) {
        return res.status(404).json({
          message: "section tidak ditemukan",
        });
      }

      const updatedSection = await Section.toggleStatus(id);

      return res.status(200).json({
        message: `status section berhasil diubah menjadi ${updatedSection.status}`,
        section: updatedSection,
      });
    } catch (error) {
      console.error("TOGGLE_SECTION_STATUS_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }
}

module.exports = SectionController;
