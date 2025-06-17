const router = require('express').Router();
const notesControllers = require("../controllers/notesControllers");
const { validarAddNote, validarGetFeedNotes, validateGetAllNotesWithVerses, validarGetNotesByVerse, validateUpdateNote } = require('../validators/noteValidators');

// Crear nota
router.post("/", validarAddNote, notesControllers.addNote);

// Obtener las notas de un verso
router.get("/:verseId/verse", validarGetNotesByVerse, notesControllers.getNotesByVerse)

// Obtener feed de noticias
router.get("/feed", validarGetFeedNotes, notesControllers.getFeedNotes)

// Obtener las notas del usuario
router.get("/", validateGetAllNotesWithVerses, notesControllers.getAllNotesWithVerses)

// Actualizar nota
router.put("/:noteId", validateUpdateNote, notesControllers.updateNote)

// Eliminar nota
router.delete("/:noteId", notesControllers.deleteNote)

module.exports = router
