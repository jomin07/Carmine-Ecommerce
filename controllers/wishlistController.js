const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');

const getWishList = async(req,res) =>{
    try {
        
        res.render('wishlist');

    } catch (error) {
        
        console.log(error.message);
    }
}

module.exports = {

    getWishList
    
}