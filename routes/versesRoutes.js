const router = require('express').Router();
const versesController = require("../controllers/versesControlles");
const { validarBookId } = require('../validators/bookValidators');
const { validarChapter } = require('../validators/chapterValidators');
const { validarHighlightVerse } = require('../validators/versesValidators');

// Obtener los versiculos de un capitulo de un libro
router.get("/:bookId/:chapter", validarBookId, validarChapter, versesController.getVerses);

// Resaltar los versiculos
router.post("/highlight", validarHighlightVerse, versesController.highlightVerse);

module.exports = router
