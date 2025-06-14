const router = require('express').Router();
const versesController = require("../controllers/versesControlles");

router.get("/:bookId/:chapter", versesController.getVerses);
router.put("/:bookId/:chapter/highlight", versesController.highlightVerse);

module.exports = router
