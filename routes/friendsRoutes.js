const router = require('express').Router();
const friendsController = require("../controllers/friendsController");

router.get("/received", friendsController.getReceivedRequests);

router.get("/search", friendsController.searchNonFriends);

router.get("/", friendsController.getFriendsList);

router.post("/accept/:id", friendsController.acceptFriendRequest);

router.post("/request", friendsController.sendFriendRequest);

router.delete("/reject/:id", friendsController.rejectFriendRequest);

router.delete("/:id", friendsController.deleteFriend);

module.exports = router
