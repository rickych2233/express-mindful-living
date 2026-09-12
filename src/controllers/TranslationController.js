const translate = require('google-translate-api-x');

class TranslationController {
  static async translateText(req, res) {
    try {
      const { text, source = 'en', targets = ['fr', 'id', 'ru', 'es'] } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ message: "text is required" });
      }

      const results = {};
      
      // We can run these in parallel
      const translationPromises = targets.map(async (target) => {
        try {
          const res = await translate(text, { from: source, to: target });
          results[target] = res.text;
        } catch (err) {
          console.error(`Translation error for target ${target}:`, err);
          results[target] = ""; // fallback to empty string on error
        }
      });

      await Promise.all(translationPromises);
      
      return res.status(200).json({
        message: "Translation successful",
        translations: results
      });
    } catch (error) {
      console.error("TRANSLATION_ERROR", error);
      return res.status(500).json({ message: "Terjadi kesalahan server saat translasi" });
    }
  }
}

module.exports = TranslationController;
