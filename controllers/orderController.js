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

        // Decreasing quantity
        for( const items of validatedItems ){
            const { productId, quantity } = items;

            await Product.updateOne({_id : productId},
                {$inc: {quantity: -quantity}});
            } 

        // Deleting cart
        await Cart.deleteOne({userId: userId});

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, error: error.message });
    }
}

const getConfirmOrder = async(req,res) =>{
    try {
        
        const userId = req.session.user_id;
        const userData = await User.findById({_id:req.session.user_id});

        res.render('confirm-order',{userId,user: userData});

    } catch (error) {
        console.log(error.message);
    }
}

const getOrders = async(req,res) =>{
    try {
        
        const userId = req.session.user_id;
        const userData = await User.findById({_id:req.session.user_id});
        const orderData = await Order.find({userId: userId}).sort({orderedDate: -1}).populate('items.productId').populate('address');

        res.render('orders',{user: userData,orders: orderData,now: new Date()});

    } catch (error) {
        console.log(error.message);
    }
}

const cancelOrder = async(req,res) =>{
    try {
        
        const userId = req.session.user_id;
        const userData = await User.findById({_id:req.session.user_id});
        const { orderId, status } = req.body;
        const orderData = await Order.findById({_id: orderId});

        for(let items of orderData.items){
            await Product.updateOne({_id: items.productId},{$inc: {quantity: items.quantity}});
        }

        await Order.findOneAndUpdate({ _id : orderId },
            { $set : { orderStatus : status }});

        const newStatus = await Order.findOne({ _id : orderId })
        res.status( 200 ).json({ success : true, status : newStatus.orderStatus });

    } catch (error) {
        console.log(error.message);
    }
}

const getUserOrderProducts = async(req,res) =>{
    
    try {
        
        const userId = req.session.user_id;
        const userData = await User.findById({_id: req.session.user_id});
        const { id } = req.params;
        const orderData = await Order.findById({_id: id}).populate('items.productId').populate('address');

        res.render('order-products',{user: userData,order: orderData,items: orderData.items});

    } catch (error) {
        console.log(error.message);
    }
}

const loadOrders = async(req,res) =>{
    try {
        const ordersData = await Order.find({}).populate( 'userId' ).populate( 'items.productId' ).populate( 'address' );
        res.render('orders',{orders: ordersData});
    
    } catch (error) {
        console.log(error.message);
    }
}

const editDeliveryStatus = async(req,res) =>{
    try {
        const id = req.query.id;
        const orderData = await Order.findById({_id: id});

        if (orderData) {
            res.render('edit-deliveryStatus',{order: orderData});
        } else {
            res.redirect('/admin/orders');
        }

    } catch (error) {
        console.log(error.message);
    }
}

const updateDeliveryStatus = async(req,res) =>{
    try {
        const orderData = await Order.findByIdAndUpdate({_id: req.body.orderId},{$set: {deliveryStatus: req.body.deliveryStatus}});
        res.redirect('/admin/orders');
   
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {

    placeOrder,
    getConfirmOrder,
    getOrders,
    cancelOrder,
    getUserOrderProducts,
    loadOrders,
    editDeliveryStatus,
    updateDeliveryStatus

}