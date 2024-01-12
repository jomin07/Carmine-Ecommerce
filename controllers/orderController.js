const User = require('../models/userModel');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const userHelper = require('../helpers/userHelper');
const paymentHelper = require('../helpers/paymentHelper');
const Razorpay = require('razorpay');
const { RAZORPAY_KEY_ID,RAZORPAY_KEY_SECRET } = process.env;
const crypto = require('crypto');

const razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
});


const placeOrder = async(req,res) =>{
    try {
        const userId = req.session.user_id;
        const userData = await User.findById({_id:req.session.user_id});
        const cartData = await Cart.findOne({userId: userId}).populate('items.productId');
        // const totalPrice = await userHelper.cartTotalPrice(userId);
        const { paymentMethod, addressId,checkoutTotal } = req.body;

        const checkoutTotalAmount = Number(checkoutTotal);
        console.log('amount is',checkoutTotal);
        console.log('checkoutTotalAmount is',checkoutTotalAmount);
        let orderStatus;
        const items = cartData.items;
        let amountPayable = checkoutTotalAmount;

        
        // Check if any product in the cart has a quantity less than the required quantity
        for (const item of items) {
            const productDetails = await Product.findById(item.productId);
            if (!productDetails) {
                throw new Error(`Product not found for ID: ${item.productId}`);
            }

            if (item.quantity > productDetails.quantity) {
                throw new Error(`Cannot place order as the stock of ${productDetails.name} is less than required`);
            }
        }

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
            totalPrice: checkoutTotalAmount,
            paymentMethod: paymentMethod,
            orderStatus: orderStatus,
            amountPayable: amountPayable,

        });

        const orderData = await order.save();

        // Decreasing quantity
        for( const items of validatedItems ){
            const { productId, quantity } = items;

            await Product.updateOne({_id : productId},
                {$inc: {quantity: -quantity}});
            } 

        // Deleting cart
        await Cart.deleteOne({userId: userId});

        console.log(paymentMethod);

        if( paymentMethod === 'COD'){

            res.json({ success: true, order: orderData });
        }else if( paymentMethod === 'razorpay'){
            // Razorpay 
            console.log('razorpay method');
            const payment = await paymentHelper.razorpayPayment( orderData._id, amountPayable );
            res.json({ payment : payment , success : false  })
        }
        

    } catch (error) {
        console.log(error.message);
        res.status(400).json({ success: false, error: error.message });
        // res.json({ success: false, error: error.message });
    }
}

const razorpayVerifyPayment = async( req, res ) => {

    console.log('Inside razorpayVerifyPayment');
    
    const { response , order } = req.body
    const { user } = req.session.user_id;
    let hmac = crypto.createHmac( 'sha256', RAZORPAY_KEY_SECRET )
    hmac.update( response.razorpay_order_id + '|' + response.razorpay_payment_id )
    hmac = hmac.digest( 'hex' );
    if( hmac === response.razorpay_signature ){
        await Order.updateOne({_id : order.receipt},{
            $set : { orderStatus : 'Confirmed'}
        })
        const orders = await Order.findOne({ _id : order.receipt })

        res.json({success : true});
        
    } else {
        res.json({success : false});
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
        const userData = await User.findById({_id: req.session.user_id});
        const { orderId, status } = req.body;
        const orderData = await Order.findById({_id: orderId});
        const paymentMethod = orderData.paymentMethod;
        const orderStatus = orderData.orderStatus;

        //Increment stock quantity of the products as order is cancelled
        for(let items of orderData.items){
            await Product.updateOne({_id: items.productId},{$inc: {quantity: items.quantity}});
        }

        //Return Money to wallet if payment was done using Razorpay
        if ((orderStatus === 'Confirmed')&&(paymentMethod === 'razorpay')) {
            
            await User.updateOne({_id: userId},
                {$inc: {wallet: orderData.totalPrice}}); 
        }

        //Change order status to cancelled
        await Order.findOneAndUpdate({ _id : orderId },{ $set : { orderStatus : status }});

        const newStatus = await Order.findOne({ _id : orderId })
        res.status( 200 ).json({ success : true, status : newStatus.orderStatus });

    } catch (error) {
        console.log(error.message);
    }
}

const returnOrder = async(req,res) =>{
    try {
        
        const userId = req.session.user_id;
        const { orderId,status } = req.body;
        const orderData = await Order.findById({_id: orderId});

        //Increment stock quantity of the products as order is returned
        for(let items of orderData.items){
            await Product.updateOne({_id: items.productId},{$inc: {quantity: items.quantity}});
        }

        //Return Money to wallet as order is returned
        await User.updateOne({_id: userId},
            {$inc: {wallet: orderData.totalPrice}}); 
        

        //Change order status to Returned
        await Order.findOneAndUpdate({_id: orderId},{$set: {orderStatus: status}});

        const newStatus = await Order.findOne({_id: orderId});
        res.status(200).json({success: true,status: newStatus.orderStatus});

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
    razorpayVerifyPayment,
    getConfirmOrder,
    getOrders,
    cancelOrder,
    returnOrder,
    getUserOrderProducts,
    loadOrders,
    editDeliveryStatus,
    updateDeliveryStatus

}