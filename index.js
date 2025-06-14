const express = require('express');
const { clerkMiddleware } = require('@clerk/express');
const cors = require('cors');
const app = express();
app.use(cors())
app.use(express.json());
app.use(clerkMiddleware());

require('dotenv').config();
const handleErrorResponse = require("./errors/handleErrorResponse");

const versesRoutes = require("./routes/versesRoutes");
const requireAuth = require('./controllers/requireAuth');

app.use("/verses", requireAuth, versesRoutes);
app.use(handleErrorResponse);

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
 