const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');

const getCartPage = async(req,res) =>{
    try {
        
        const userId = req.session.user_id;
        const userData = await User.findById({_id:req.session.user_id});
        const cartItems = await Cart.findOne({userId: userId}).populate('items.productId');

        console.log(cartItems);

        if (userData && cartItems) {
            res.render('cart',{user: userData,cartItems: cartItems}); 
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
                console.log(exist);

                if (exist) {
                    const availableStock = stock - exist.quantity

                    if (availableStock > 0) {
                        await Cart.updateOne({ userId: userId, 'items.productId': productId }, {
                            $inc: {
                                'items.$.quantity': 1
                            }
                        });
                        res.redirect('/shop',{message: 'Product Added to Cart'});

                    } else {

                        res.redirect('/shop',{message: "Oops! It seems you've reached the maximum quantity of products available for purchase."});
                    }
                } else {

                    await Cart.updateOne({ userId: userId }, {
                        $push: {
                            items: {
                                productId: productId
                            }
                        }
                    })
                }

            } else {

                const cart = new Cart({
                    userId: userId,
                    items:[{
                        productId: productId
                    }]
                });

                await cart.save();
                res.redirect('/shop',{message: 'Product Added to Cart'});
                
            }
        } 

    } catch (error) {
        
        console.log(error.message);
    }
}

module.exports = {
    getCartPage,
    addToCart
}