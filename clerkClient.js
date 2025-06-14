const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');

module.exports = ClerkExpressWithAuth({
  apiKey: process.env.CLERK_SECRET_KEY,
});
