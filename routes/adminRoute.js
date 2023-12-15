const express = require("express");
const adminRoute = express();
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('../config/config');
const auth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

adminRoute.use(session({secret:config.sessionSecret,resave:false,saveUninitialized:true}));

adminRoute.use(bodyParser.json());
adminRoute.use(bodyParser.urlencoded({extended:true}));

adminRoute.set('view engine','ejs');
adminRoute.set('views','./views/admin');

// adminRoute.use(express.static('public'));
// adminRoute.use(express.static(path.join(__dirname, 'public')));

adminRoute.get('/',auth.isLogout,adminController.loadLogin);
adminRoute.post('/',adminController.verifyLogin);
adminRoute.get('/home',auth.isLogin,adminController.loadHome);
adminRoute.get('/categories',auth.isLogin,adminController.loadCategories);
adminRoute.get('/users',auth.isLogin,adminController.loadUsers);
adminRoute.get('/block-user',adminController.blockUser);
adminRoute.get('/unblock-user',adminController.unblockUser);
adminRoute.get('/logout',auth.isLogin,adminController.logout);


adminRoute.get('*',(req,res) =>{
    res.redirect('/admin');
});
module.exports = adminRoute;