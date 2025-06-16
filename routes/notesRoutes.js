const router = require('express').Router();
const notesControllers = require("../controllers/notesControllers");

router.post("/", notesControllers.addNote);

router.get("/:verseId/verse", notesControllers.getNotesByVerse)

router.get("/feed", notesControllers.getFeedNotes)

router.get("/", notesControllers.getAllNotesWithVerses)

router.put("/:noteId", notesControllers.updateNote)

router.delete("/:noteId", notesControllers.deleteNote)

module.exports = router
