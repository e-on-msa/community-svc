const express = require("express");
const router = express.Router();
const board = require("../controllers/boardController");

router.get("/activities/user/:userId", board.getUserActivities);

module.exports = router;
