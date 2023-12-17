const Product = require('../models/productModel');
const Category = require('../models/categoryModel');

const loadProducts = async(req,res) =>{
    try {
        const productsData = await Product.find({}).populate('category');
        res.render('products',{products: productsData});
    } catch (error) {
        console.log(error.message);
    }
}

const loadAddProduct = async(req,res) =>{
    try {
        const categoriesData = await Category.find({status: true});
        res.render('add-product',{categories: categoriesData});
    } catch (error) {
        console.log(error.message);
    }
}

const addProduct = async(req,res) =>{
    try {
        const img = [];

        for(i=0;i<req.files.length;i++){
            img[i] = req.files[i].filename;
        }

        // Find the ObjectId of the selected category
        const selectedCategory = await Category.findOne({ name: req.body.category });
        const categoryId = selectedCategory._id;

        const product = new Product({
            name: req.body.name,
            brand: req.body.brand,
            price: req.body.price,
            category: categoryId,
            description: req.body.description,
            image: img,
            quantity: req.body.quantity,
        });

        const productData = await product.save();

        if (productData) {
            res.redirect('/admin/products');
        } else {
            res.render('add-product',{message:'Something Wrong'});
        }

    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    loadProducts,
    loadAddProduct,
    addProduct
}