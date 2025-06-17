const express = require('express');
const { clerkMiddleware } = require('@clerk/express');
const cors = require('cors');
const app = express();
app.use(cors())
app.use(express.json());
app.use(clerkMiddleware());

require('dotenv').config();
const handleErrorResponse = require("./errors/handleErrorResponse");

const requireAuth = require('./controllers/requireAuth');
const versesRoutes = require("./routes/versesRoutes");
const notesRoutes = require("./routes/notesRoutes");
const friendsRoutes = require("./routes/friendsRoutes");

app.use("/verses", requireAuth, versesRoutes);
app.use("/notes", requireAuth, notesRoutes);
app.use("/friends", requireAuth, friendsRoutes)
app.use(handleErrorResponse);

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
 