const express = require("express");
const userRoute = express();

const path = require('path');
const session = require('express-session');
const userController = require('../controllers/userController');
const wishlistController = require('../controllers/wishlistController');
const cartController = require('../controllers/cartController');
const orderController = require('../controllers/orderController');
const bodyParser = require('body-parser');
const config = require('../config/config');
const auth = require('../middleware/auth');
const flash = require('connect-flash');

userRoute.use(session({secret:config.sessionSecret,resave:false,saveUninitialized:true}));

userRoute.use(bodyParser.json());
userRoute.use(bodyParser.urlencoded({extended:true}));

userRoute.use(flash());

userRoute.set('view engine','ejs');
userRoute.set('views','./views/users');

// userRoute.use(express.static(path.join(__dirname, 'public')));

userRoute.get('/register',auth.isLogout,userController.loadRegister);
userRoute.post('/register',userController.insertUser);

// userRoute.post('/send', userController.sendOtp);
userRoute.post('/verify', userController.verifyOtp);
userRoute.post('/resend', userController.resendOtp);

userRoute.get('/',auth.isLogout,userController.getLanding);
userRoute.get('/login',auth.isLogout,userController.loginLoad);

userRoute.post('/login',userController.verifyLogin);

userRoute.get('/home',auth.isBlocked,auth.isLogin,userController.loadHome);

userRoute.get('/profile',auth.isBlocked,auth.isLogin,userController.getProfile);

userRoute.get('/profile/edit',auth.isBlocked,auth.isLogin,userController.getProfileEdit);

userRoute.post('/profile/edit',userController.editProfile);

userRoute.get('/profile/addresses',auth.isBlocked,auth.isLogin,userController.getAddress);

userRoute.get('/profile/addresses/add-address',auth.isBlocked,auth.isLogin,userController.getAddAddress);

userRoute.post('/profile/addresses/add-address',userController.addAddress);

userRoute.get('/profile/addresses/edit-address',auth.isBlocked,auth.isLogin,userController.getEditAddress);

userRoute.post('/profile/addresses/edit-address',userController.editAddress);

userRoute.get('/profile/addresses/remove-address',auth.isBlocked,auth.isLogin,userController.removeAddress);



userRoute.get('/wishlist',auth.isBlocked,auth.isLogin,wishlistController.getWishList);

userRoute.post('/add-to-wishlist/:id',auth.isBlocked,auth.isLogin,wishlistController.addToWishlist);

userRoute.post('/delete-wishlist-item/:id',auth.isBlocked,auth.isLogin,wishlistController.deleteWishlistItem);



userRoute.get('/cart',auth.isBlocked,auth.isLogin,cartController.getCartPage);

userRoute.post('/add-to-cart/:id',auth.isBlocked,auth.isLogin,cartController.addToCart);

userRoute.post('/update-cart-quantity/:productId',auth.isBlocked,auth.isLogin,cartController.updateCartQuantity);

userRoute.post('/delete-cart-item/:id',auth.isBlocked,auth.isLogin,cartController.deleteCartItem);

userRoute.post('/clear-cart',auth.isBlocked,auth.isLogin,cartController.clearCart);

userRoute.get('/checkout',auth.isBlocked,auth.isLogin,cartController.getCheckout);

userRoute.get('/checkout/add-address',auth.isBlocked,auth.isLogin,cartController.getCheckoutAddAddress);

userRoute.post('/checkout/add-address',cartController.checkoutAddAddress);

userRoute.get('/checkout/edit-address',auth.isBlocked,auth.isLogin,cartController.getCheckoutEditAddress);

userRoute.post('/checkout/edit-address',cartController.checkoutEditAddress);

userRoute.get('/checkout/remove-address',auth.isBlocked,auth.isLogin,cartController.checkoutRemoveAddress);

userRoute.post('/checkout',auth.isBlocked,auth.isLogin,orderController.placeOrder);

userRoute.get('/confirm-order',auth.isBlocked,auth.isLogin,orderController.getConfirmOrder);

userRoute.post('/verifyPayment',auth.isBlocked,auth.isLogin,orderController.razorpayVerifyPayment);

userRoute.get('/orders',auth.isBlocked,auth.isLogin,orderController.getOrders);

userRoute.patch('/cancel-order',auth.isBlocked,auth.isLogin,orderController.cancelOrder);

userRoute.get('/view-order-products/:id',auth.isBlocked,orderController.getUserOrderProducts);




userRoute.get('/forget-password',auth.isLogout,userController.getForgetPassword);

userRoute.post('/forget-password',userController.forgetPassword);

userRoute.get('/reset-password',auth.isLogout,userController.getResetPassword);

userRoute.post('/reset-password',userController.resetPassword);

userRoute.get('/logout',auth.isLogin,userController.userLogout);



userRoute.get('/shop',userController.getShop);
userRoute.get('/shop/:id',userController.getProductDetails);

module.exports = userRoute;