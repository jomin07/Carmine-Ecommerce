const User = require('../models/userModel');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const userHelper = require('../helpers/userHelper');


const placeOrder = async(req,res) =>{
    try {
        console.log('Inside Place order');
        const userId = req.session.user_id;
        const userData = await User.findById({_id:req.session.user_id});
        const cartData = await Cart.findOne({userId: userId}).populate('items.productId');
        const totalPrice = await userHelper.cartTotalPrice(userId);
        const { paymentMethod, addressId } = req.body;
        let orderStatus;
        const items = cartData.items;

        paymentMethod === 'COD' ? orderStatus = 'Confirmed' : orderStatus = 'Pending';

        // Ensure each item has a valid price before saving the order
        const validatedItems = items.map(item => {
            if (!item.productId.price) {
                throw new Error(`Price is required for product: ${item.productId.name}`);
            }
            return {
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.price,
            };
        });

        const order = new Order({

            userId: userId,
            address: addressId,
            items: validatedItems,
            totalPrice: totalPrice,
            paymentMethod: paymentMethod,
            orderStatus: orderStatus,

        });

        const orderData = await order.save();
        res.json({ success: true, order: orderData });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, error: error.message });
    }
}

const getConfirmOrder = async(req,res) =>{
    try {
        
        const userId = req.session.user_id;
        const userData = await User.findById({_id:req.session.user_id});
        const cartData = await Cart.findOne({userId: userId}).populate('items.productId');
        const totalPrice = await userHelper.cartTotalPrice(userId);

        res.render('confirm-order',{userId,user: userData,totalPrice});

    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {

    placeOrder,
    getConfirmOrder

}