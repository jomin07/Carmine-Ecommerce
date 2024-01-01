const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');

const getCartPage = async(req,res) =>{
    try {
        
        const userId = req.session.user_id;
        const userData = await User.findById({_id:req.session.user_id});
        const cartItems = await Cart.findOne({userId: userId}).populate('items.productId');

        if (userData && cartItems) {
            res.render('cart',{user: userData,cartItems: cartItems}); 
        }
        else if (userData) {
            res.render('cart',{user: userData,cartItems: []}); 
        }
        else {
            res.render('cart'); 
        }
        
    } catch (error) {
        
        console.log(error.message);
    }
}


const addToCart = async(req,res) =>{
    try {
        
        const userId = req.session.user_id;
        const productId = req.params.id;

        const userCart = await Cart.findOne({userId: userId});
        const productStock = await Product.findOne({_id: productId},{quantity: 1});
        const stock = productStock.quantity;

        if (stock > 0) {
            
            if (userCart) {
            
                const exist = userCart.items.find(item => item.productId == productId);
                

                if (exist) {
                    const availableStock = stock - exist.quantity;
                    console.log(exist);

                    if (availableStock > 0) {
                        await Cart.updateOne({ userId: userId, 'items.productId': productId }, {
                            $inc: {
                                'items.$.quantity': 1
                            }
                        });
                        res.redirect('/shop');

                    } else {

                        res.redirect('/shop');
                    }
                } else {

                    await Cart.updateOne({ userId: userId }, {
                        $push: {
                            items: {
                                productId: productId
                            }
                        }
                    });
                }

            } else {

                const cart = new Cart({
                    userId: userId,
                    items:[{
                        productId: productId
                    }]
                });

                await cart.save();
                res.redirect('/shop');
                
            }
        } 

    } catch (error) {      
        console.log(error.message);
    }
}


const deleteCartItem = async(req,res) =>{
    try {

        const userId = req.session.user_id;
        const productId = req.params.id;

        await Cart.updateOne({userId: userId},{
            $pull: {
                items: {
                    productId: productId
                }
            }
        });

        res.redirect('/cart');
        
    } catch (error) {
        console.log(error.message);
    }
}

const clearCart = async(req,res) =>{
    try {

        const userId = req.session.user_id;
        console.log(userId);
        await Cart.deleteOne({userId: userId});

        res.redirect('/cart');
        
    } catch (error) {
        console.log(error.message);
    }
}


module.exports = {

    getCartPage,
    addToCart,
    deleteCartItem,
    clearCart

}