// authMiddleware.js
const { getAuth, clerkClient } = require("@clerk/express");
const { throwBadRequestError, throwUnauthorizedError } = require("../errors/throwHTTPErrors");

async function requireAuth(req, res, next) {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            throwUnauthorizedError("Tu sesión ha caducado o es inválida. Vuelve a iniciar sesión para continuar.");
        }

        // Obtener el usuario completo desde Clerk
        const user = await clerkClient.users.getUser(userId);

        // Construir un objeto limpio con los datos básicos
        req.user = {
            id: user.id,
            nombre: user.firstName,
            apellidos: user.lastName,
            email: user.emailAddresses?.[0]?.emailAddress || null,
            telefono: user.phoneNumbers?.[0]?.phoneNumber || null,
            imagen: user.imageUrl,
        };

        next();
    } catch (err) {
        next(err)
    }
}

module.exports = requireAuth;
