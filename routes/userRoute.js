const express = require("express");
const userRoute = express();

const path = require('path');
const session = require('express-session');
const userController = require('../controllers/userController');
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

userRoute.get('/wishlist',auth.isBlocked,auth.isLogin,userController.getWishList);

userRoute.get('/cart',auth.isBlocked,auth.isLogin,userController.getCartPage);

userRoute.get('/logout',auth.isLogin,userController.userLogout);

userRoute.get('/shop',userController.getShop);
userRoute.get('/shop/:id',userController.getProductDetails);

module.exports = userRoute;