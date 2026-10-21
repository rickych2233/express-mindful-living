const translate = require('google-translate-api-x');
const { translateContent } = require('../utils/translateContent');
const LANGUAGES = new Set(['en', 'fr', 'id', 'ru', 'es']);

class TranslationController {
  static async translateText(req, res) {
    try {
      const { text, source = 'en', targets = ['fr', 'id', 'ru', 'es'] } = req.body;
      if (typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ message: "text is required" });
      }
      if (text.length > 50000 || !LANGUAGES.has(source) || !Array.isArray(targets) ||
          !targets.length || targets.length > 5 || targets.some(t => !LANGUAGES.has(t))) {
        return res.status(400).json({ message: 'Bahasa atau panjang teks tidak valid' });
      }

      const results = {};
      const errors = {};
      
      // We can run these in parallel
      const translationPromises = [...new Set(targets)].map(async (target) => {
        try {
          results[target] = source === target ? text : await translateContent(text, source, target, translate);
        } catch (err) {
          console.error(`Translation error for target ${target}:`, err);
          errors[target] = 'Terjemahan gagal. Silakan coba lagi.';
        }
      });

      await Promise.all(translationPromises);
      
      const failed = Object.keys(errors).length;
      const succeeded = Object.keys(results).length;
      return res.status(succeeded ? 200 : 502).json({
        message: failed ? 'Sebagian atau seluruh terjemahan gagal' : 'Translation successful',
        status: failed ? (succeeded ? 'partial' : 'failed') : 'complete',
        translations: results,
        errors
      });
    } catch (error) {
      console.error("TRANSLATION_ERROR", error);
      return res.status(500).json({ message: "Terjadi kesalahan server saat translasi" });
    }
  }
}

module.exports = TranslationController;
