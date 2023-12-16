const express = require("express");
const adminRoute = express();
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('../config/config');
const auth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');
const flash = require('connect-flash');

adminRoute.use(session({secret:config.sessionSecret,resave:false,saveUninitialized:true}));

adminRoute.use(bodyParser.json());
adminRoute.use(bodyParser.urlencoded({extended:true}));

adminRoute.use(flash());

adminRoute.set('view engine','ejs');
adminRoute.set('views','./views/admin');

// adminRoute.use(express.static('public'));
// adminRoute.use(express.static(path.join(__dirname, 'public')));

adminRoute.get('/',auth.isLogout,adminController.loadLogin);
adminRoute.post('/',adminController.verifyLogin);
adminRoute.get('/home',auth.isLogin,adminController.loadHome);
adminRoute.get('/categories',auth.isLogin,categoryController.loadCategories);
adminRoute.get('/categories/add-category',auth.isLogin,categoryController.loadAddCategory);
adminRoute.post('/categories/add-category',categoryController.insertCategory);
adminRoute.get('/categories/edit-category',auth.isLogin,categoryController.editCategory);
adminRoute.post('/categories/edit-category',categoryController.updateCategory);
adminRoute.get('/categories/list-category',auth.isLogin,categoryController.listCategory);
adminRoute.get('/categories/unlist-category',auth.isLogin,categoryController.unListCategory);
adminRoute.get('/categories/delete-category',auth.isLogin,categoryController.deleteCategory);
adminRoute.get('/users',auth.isLogin,adminController.loadUsers);
adminRoute.get('/users/block-user',auth.isLogin,adminController.blockUser);
adminRoute.get('/users/unblock-user',auth.isLogin,adminController.unblockUser);
adminRoute.get('/logout',auth.isLogin,adminController.logout);


adminRoute.get('*',(req,res) =>{
    res.redirect('/admin');
});
module.exports = adminRoute;