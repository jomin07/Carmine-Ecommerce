const express = require("express");
const adminRoute = express();
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('../config/config');
const auth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');

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
adminRoute.get('/categories',auth.isLogin,categoryController.loadCategories);
adminRoute.get('/categories/add-category',auth.isLogin,categoryController.loadAddCategory);
adminRoute.get('/categories/edit-category',auth.isLogin,categoryController.loadEditCategory);
adminRoute.get('/users',auth.isLogin,adminController.loadUsers);
adminRoute.get('/users/block-user',adminController.blockUser);
adminRoute.get('/users/unblock-user',adminController.unblockUser);
adminRoute.get('/logout',auth.isLogin,adminController.logout);


adminRoute.get('*',(req,res) =>{
    res.redirect('/admin');
});
module.exports = adminRoute;