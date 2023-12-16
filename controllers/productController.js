const Product = require('../models/productModel');

const loadProducts = async(req,res) =>{
    try {
        const productsData = await Product.find({});
        res.render('products',{products: productsData});
    } catch (error) {
        console.log(error.message);
    }
}

const loadAddProduct = async(req,res) =>{
    try {
        res.render('add-product');
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    loadProducts,
    loadAddProduct
}