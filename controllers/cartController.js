const User = require('../models/userModel');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const userHelper = require('../helpers/userHelper');

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

const updateCartQuantity = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const productId = req.params.productId;
        const change = req.body.change;

        // Fetch the user's cart
        const userCart = await Cart.findOne({ userId: userId });

        // Find the item in the cart
        const cartItem = userCart.items.find(item => item.productId == productId);

        if (cartItem) {
            // Update the quantity based on the change
            const newQuantity = cartItem.quantity + change;

            if (newQuantity > 0) {
                await Cart.updateOne({
                    userId: userId,
                    'items.productId': productId
                }, {
                    $set: {
                        'items.$.quantity': newQuantity
                    }
                });
                res.json({ success: true });
            } else {
                // If the quantity is zero, remove the item from the cart
                await Cart.updateOne({
                    userId: userId
                }, {
                    $pull: {
                        items: {
                            productId: productId
                        }
                    }
                });
                res.json({ success: true });
            }
        } else {
            res.json({ success: false, message: 'Item not found in the cart' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
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
        await Cart.deleteOne({userId: userId});

        res.redirect('/cart');
        
    } catch (error) {
        console.log(error.message);
    }
}

const getCheckout = async(req,res) =>{
    try {

        const userId = req.session.user_id;
        const userData = await User.findById({_id: userId});
        const cartItems = await Cart.findOne({userId: userId}).populate('items.productId');
        const addressData = await Address.find({user: userId,status: true});
        const totalPrice = await userHelper.cartTotalPrice(userId);

        res.render('checkout',{userId,user: userData,cartItems,address: addressData,totalPrice});
        
    } catch (error) {
        console.log(error.message);
    }
}

const getCheckoutAddAddress = async(req,res) =>{
    try {

        const userData = await User.findById({_id:req.session.user_id});
        res.render('add-address',{user: userData});

    } catch (error) {
        console.log(error.message);
    }
}

const checkoutAddAddress = async(req,res) =>{
    try {
        
        const address = new Address({
            name: req.body.name,
            mobile: req.body.mno,
            pincode: req.body.pincode,
            user: req.session.user_id,
            locality: req.body.locality,
            address: req.body.address,
            city: req.body.city,
            state: req.body.state,
            country: req.body.country,
            landmark: req.body.landmark,
        });

        const addressData = await address.save();

        if (addressData) {
            res.redirect('/checkout');
        } else {
            res.render('add-address',{message:'Something Wrong'});
        }

    } catch (error) {
        console.log(error.message);
    }
}

const getCheckoutEditAddress = async(req,res) =>{
    try {
        const id = req.query.id;
        const addressData = await Address.findById(id);

        res.render('edit-address',{address: addressData});

    } catch (error) {
        console.log(error.message);
    }
}

const checkoutEditAddress = async(req,res) =>{
    try {
        const addressData = await Address.findByIdAndUpdate({_id: req.body.addressId},{$set: {name: req.body.name,mobile: req.body.mno,pincode: req.body.pincode,locality: req.body.locality,address: req.body.address,city: req.body.city,state: req.body.state,country: req.body.country,landmark: req.body.landmark}});

        res.redirect('/checkout');

    } catch (error) {
        console.log(error.message);
    }
}

const checkoutRemoveAddress = async ( req, res ) => {
    try {
        
        const id = req.query.id;
        const addressData = await Address.findById(id);
        await addressData.updateOne({$set: {status: false}});

        res.redirect('/checkout');

    } catch (error) { 
        console.log(error.message);
    }
}


module.exports = {

    getCartPage,
    addToCart,
    updateCartQuantity,
    deleteCartItem,
    clearCart,
    getCheckout,
    getCheckoutAddAddress,
    checkoutAddAddress,
    getCheckoutEditAddress,
    checkoutEditAddress,
    checkoutRemoveAddress

}