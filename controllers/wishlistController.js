const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Wishlist = require('../models/wishlistModel');

const getWishList = async(req,res) =>{
    try {
        
        const userData = await User.findById({_id:req.session.user_id});

        if (userData) {
            res.render('wishlist',{user: userData}); 
        }
        else {
            res.render('wishlist'); 
        }

    } catch (error) {
        
        console.log(error.message);
    }
}

const addToWishlist = async(req,res) =>{
    try {
        
        

    } catch (error) {
        
        console.log(error.message);

    }
}

module.exports = {

    getWishList
    
}