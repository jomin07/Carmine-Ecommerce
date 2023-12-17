const express = require("express");
const adminRoute = express();
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('../config/config');
const auth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');
const productController = require('../controllers/productController');
const flash = require('connect-flash');
const multer = require('multer');


adminRoute.use(session({secret:config.sessionSecret,resave:false,saveUninitialized:true}));

adminRoute.use(bodyParser.json());
adminRoute.use(bodyParser.urlencoded({extended:true}));

adminRoute.use(flash());

adminRoute.set('view engine','ejs');
adminRoute.set('views','./views/admin');

const storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,path.join(__dirname,'../public/admin/productImages'));
    },
    filename:function(req,file,cb){
        const name = Date.now()+'-'+file.originalname;
        cb(null,name);
    }
});

const upload = multer({storage:storage});

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

adminRoute.get('/products',auth.isLogin,productController.loadProducts);
adminRoute.get('/products/add-product',auth.isLogin,productController.loadAddProduct);
adminRoute.post('/products/add-product',upload.array('image'),productController.addProduct);
adminRoute.get('/products/edit-product',auth.isLogin,productController.editProduct);
adminRoute.get('/products/edit-product/delete-image',auth.isLogin,productController.deleteImage);
adminRoute.post('/products/edit-product',upload.array('image'),productController.updateProduct);
adminRoute.get('/products/list-product',auth.isLogin,productController.listProduct);
adminRoute.get('/products/unlist-product',auth.isLogin,productController.unListProduct);
// adminRoute.get('/products/delete-product',auth.isLogin,productController.deleteProduct);

adminRoute.get('/users',auth.isLogin,adminController.loadUsers);
adminRoute.get('/users/block-user',auth.isLogin,adminController.blockUser);
adminRoute.get('/users/unblock-user',auth.isLogin,adminController.unblockUser);

adminRoute.get('/logout',auth.isLogin,adminController.logout);


adminRoute.get('*',(req,res) =>{
    res.redirect('/admin');
});
module.exports = adminRoute;