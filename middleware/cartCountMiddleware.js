const userHelper = require('../helpers/userHelper');

async function getCartCount(req, res, next) {
    try {
        if (req.session.user_id) {
            const userId = req.session.user_id;
            const cartCount = await userHelper.cartTotalCount(userId);
            res.locals.cartCount = cartCount;
        } else {
            res.locals.cartCount = 0; // Set a default value if user is not logged in
        }
        next();
    } catch (error) {
        console.error('Error fetching cartCount:', error.message);
        next(error);
    }
}

module.exports = {
    getCartCount
};
