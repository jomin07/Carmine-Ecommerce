const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Wishlist = require('../models/wishlistModel');

const getWishList = async(req,res) =>{
    try {
        
        const userId = req.session.user_id;
        const userData = await User.findById({_id:req.session.user_id});
        const wishlistItems = await Wishlist.findOne({userId: userId}).populate('items.productId');

        if (userData && wishlistItems) {
            res.render('wishlist',{user: userData,wishlistItems: wishlistItems}); 
        }
        else if (userData) {
            res.render('wishlist',{user: userData,wishlistItems: []}); 
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
        
        const productId = req.params.id;
        const userId = req.session.user_id;

        const userWishlist = await Wishlist.findOne({userId: userId});
        const productStock = await Product.findOne({_id: productId},{quantity: 1});
        const stock = productStock.quantity;

        if (userWishlist) {
            
            const exist = userWishlist.items.find(item => item.productId == productId);
            

            if (exist) {
                
                res.redirect('/shop');

            } else {

                await Wishlist.updateOne({userId: userId},{
                    
                    $push: {   
                        items: {
                            productId: productId
                        }
                    }
                });
                
            }

        } else {
            
            const wishlist = new Wishlist({
                userId: userId,
                items: [{
                    productId: productId
                }] 
            });

            await wishlist.save();
            res.redirect('/shop');

        }


    } catch (error) {
        
        console.log(error.message);

    }
}

const deleteWishlistItem = async(req,res) =>{
    try {

        const userId = req.session.user_id;
        const productId = req.params.id;

        await Wishlist.updateOne({userId: userId},{
            $pull: {
                items: {
                    productId: productId
                }
            }
        });

        res.redirect('/wishlist');
        
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {

    getWishList,
    addToWishlist,
    deleteWishlistItem
    
}