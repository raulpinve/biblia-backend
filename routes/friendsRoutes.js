const router = require('express').Router();
const friendsController = require("../controllers/friendsController");
const { validateSearchNonFriends, validateAcceptFriendRequest, validateSendFriendRequest, validateRejectFriendRequest, validateDeleteFriend } = require('../validators/friendsValidators');

// Obtener solicitudes de amistad
router.get("/received", friendsController.getReceivedRequests);

// Buscar amigos
router.get("/search", validateSearchNonFriends, friendsController.searchNonFriends);

// Obtener lista de amigos
router.get("/", friendsController.getFriendsList);

// Aceptar solicitud de amistad
router.post("/accept/:id", validateAcceptFriendRequest, friendsController.acceptFriendRequest);

// Enviar solicitud de amistad
router.post("/request", validateSendFriendRequest, friendsController.sendFriendRequest);

// Eliminar solicitud de amistad 
router.delete("/reject/:id", validateRejectFriendRequest, friendsController.rejectFriendRequest);

// Eliminar amistad
router.delete("/:id", validateDeleteFriend, friendsController.deleteFriend);

module.exports = router
