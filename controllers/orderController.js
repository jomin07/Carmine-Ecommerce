const User = require('../models/userModel');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const userHelper = require('../helpers/userHelper');


const placeOrder = async(req,res) =>{
    try {
        
        const userId = req.session.user_id;
        const userData = await User.findById({_id:req.session.user_id});
        const cartData = await Cart.findOne({userId: userId}).populate('items.productId');
        const totalPrice = await userHelper.cartTotalPrice(userId);
        const { paymentMethod, addressId } = req.body;
        let orderStatus;
        const items = cartData.items;

        paymentMethod === 'COD' ? orderStatus = 'Confirmed' : orderStatus = 'Pending';

        const order = new Order({

            userId: userId,
            address: addressId,
            items: items,
            totalPrice: totalPrice,
            paymentMethod: paymentMethod,
            orderStatus: orderStatus,

        });

        const orderData = await order.save();

    } catch (error) {
        console.log(error.message);
    }
}

const getConfirmOrder = async(req,res) =>{
    try {
        
        res.render('confirm-order');

    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {

    placeOrder,
    getConfirmOrder

}