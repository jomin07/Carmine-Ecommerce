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
        const { paymentMethod, addressId,checkoutTotal,walletAmount } = req.body;
        const checkoutTotalAmount = Number(checkoutTotal);
        let walletBalance;
        if(walletAmount){
            walletBalance = Number(walletAmount);
        }

        console.log('amount is',checkoutTotal);
        console.log('checkoutTotalAmount is',checkoutTotalAmount);
        console.log('walletAmount is',walletAmount);
        let orderStatus;
        const items = cartData.items;

        let walletUsed,amountPayable;
        

        if (walletAmount) {
            if (walletBalance < checkoutTotalAmount) {
                amountPayable = checkoutTotalAmount - walletBalance;
                walletUsed = walletBalance;
            } else if(walletBalance >= checkoutTotalAmount){
                amountPayable = 0;
                walletUsed = checkoutTotalAmount;
            }
        } else {
            amountPayable = checkoutTotalAmount;
        }
        console.log('walletBalance is',walletBalance);
        console.log('amountPayable is',amountPayable);
        console.log('walletUsed is',walletUsed);

        
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
        if(amountPayable === 0){
            orderStatus = 'Confirmed';
        }

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
            walletUsed: walletUsed

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

        if( paymentMethod === 'COD' || amountPayable === 0){

            if( walletAmount ) {
                await User.updateOne({ _id : userId }, {
                    $inc : {
                        wallet : -walletUsed
                    },
                    $push : {
                        walletHistory : {
                            date : Date.now(),
                            amount : -walletUsed,
                            message : 'Used for purchase'
                        }
                    }
                })
            }

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
    const userId = req.session.user_id;
    console.log(userId);
    let hmac = crypto.createHmac( 'sha256', RAZORPAY_KEY_SECRET )
    hmac.update( response.razorpay_order_id + '|' + response.razorpay_payment_id )
    hmac = hmac.digest( 'hex' );
    if( hmac === response.razorpay_signature ){
        await Order.updateOne({_id : order.receipt},{
            $set : { orderStatus : 'Confirmed'}
        })
        const orders = await Order.findOne({ _id : order.receipt });
        if( orders.walletUsed ) {
            await User.updateOne({ _id : userId }, {
                $inc : {
                    wallet : -orders.walletUsed
                },
                $push : {
                    walletHistory : {
                        date : Date.now(),
                        amount : -orders.walletUsed,
                        message : 'Used for purchase'
                    }
                }
            });
        }

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
        const userData = await User.findById({_id: userId});
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
            
            // await User.updateOne({_id: userId},{
            //     $inc: {wallet: orderData.totalPrice}}); 
            
            await User.updateOne({ _id : userId },{
                $inc : {
                    wallet : orderData.totalPrice
                },
                $push : {
                    walletHistory : {
                        date : Date.now(),
                        amount : orderData.totalPrice,
                        message : "Deposited while cancelled order"
                    }
                }
            });

        }else if( orderStatus === 'Confirmed' && paymentMethod === 'COD' ) {

            if( orderData.walletUsed && orderData.walletUsed > 0 ) {
                await User.updateOne({ _id : userId },{
                    $inc : {
                        wallet : orderData.walletUsed
                    },
                    $push : {
                        walletHistory : {
                            date : Date.now(),
                            amount : orderData.walletUsed,
                            message : "Deposited while cancelled order"
                        }
                    }
                })
            }
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
        await User.updateOne({_id: userId},{
            $inc: {
                wallet: orderData.totalPrice
            },
            $push : {
                walletHistory : {
                    date : Date.now(),
                    amount : orderData.totalPrice,
                    message : "Deposited while returned order"
                }
            }
        }); 
        

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