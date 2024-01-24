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
const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const easyinvoice = require('easyinvoice');

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
        const { orderId, status,cancellationReason } = req.body;
        const orderData = await Order.findById({_id: orderId});
        const paymentMethod = orderData.paymentMethod;
        const orderStatus = orderData.orderStatus;

        console.log(cancellationReason);

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

        //Change order status to cancelled and update cancellation Reason
        await Order.findOneAndUpdate({ _id : orderId },{ $set : { orderStatus : status,cancellationReason: cancellationReason }});

        const newStatus = await Order.findOne({ _id : orderId })
        res.status( 200 ).json({ success : true, status : newStatus.orderStatus,cancellationReason });

    } catch (error) {
        console.log(error.message);
    }
}

const returnOrder = async(req,res) =>{
    try {
        
        const userId = req.session.user_id;
        const { orderId,status,returnReason } = req.body;
        const orderData = await Order.findById({_id: orderId});

        //Increment stock quantity of the products as order is returned
        // for(let items of orderData.items){
        //     await Product.updateOne({_id: items.productId},{$inc: {quantity: items.quantity}});
        // }

        //Return Money to wallet as order is returned
        // await User.updateOne({_id: userId},{
        //     $inc: {
        //         wallet: orderData.totalPrice
        //     },
        //     $push : {
        //         walletHistory : {
        //             date : Date.now(),
        //             amount : orderData.totalPrice,
        //             message : "Deposited while returned order"
        //         }
        //     }
        // }); 
        

        //Change order status to Return Pending and update Return Reason
        await Order.findOneAndUpdate({_id: orderId},{$set: {orderStatus: status,returnReason: returnReason}});

        const newStatus = await Order.findOne({_id: orderId});
        res.status(200).json({success: true,status: newStatus.orderStatus,returnReason});

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

const downloadInvoice = async(req, res) => {
    try {

        const { id } = req.params;
        console.log(id);
        
        // Fetch the order data from the database
        const orderData = await Order.findById(id)
            .populate('items.productId')
            .populate('address')
            .populate('userId');

        
        // Replace this with your actual invoice data
        const data = {
            documentTitle: 'Invoice', // optional
            currency: 'INR', // optional
            taxNotation: 'vat', // optional
            marginTop: 25, // optional
            marginRight: 25, // optional
            marginLeft: 25, // optional
            marginBottom: 25, // optional
            // logo: '/public/assets/imgs/theme/logo.svg', // optional
            images: {
                logo: "https://public.budgetinvoice.com/img/logo_en_original.png",
                background: "https://public.budgetinvoice.com/img/watermark-draft.jpg"
            },
            sender: {
            company: 'Carmine',
            address: '1234 Mumbai',
            zip: '123456',
            city: 'Mumbai',
            country: 'India',
            },
            client: {
            company: orderData.address.name,
            address: orderData.address.address,
            zip: orderData.address.pincode,
            city: orderData.address.city,
            country: orderData.address.country,
            },
            information: {
                // Invoice number
                "number": orderData._id.toString(),
                // Invoice data
                "date": orderData.orderedDate.toISOString().split('T')[0],
            },
            products: orderData.items.map((item) => ({
                quantity:  parseInt(item.quantity),
                description: item.productId.name,
                "tax-rate": 0, // Set the appropriate tax percentage
                price:  parseInt(item.price)
            })),
            total:orderData.totalPrice,
            bottomNotice: 'Thank you for your business!', // optional
            // Settings to customize your invoice
            settings: {
                currency: "INR", // See documentation 'Locales and Currency' for more info. Leave empty for no currency.
            }
        };

        // Generate the invoice
        easyinvoice.createInvoice(data, (result) => {
            // Set the response header for PDF content
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');

            // Send the generated PDF to the response
            res.send(Buffer.from(result.pdf, 'base64'));
        });

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

const getReturnApprove = async(req,res) =>{
    try {
        const id = req.query.id;
        const orderData = await Order.findById({_id: id});

        if (orderData) {
            res.render('return-approve',{order: orderData});
        } else {
            res.redirect('/admin/orders');
        }

    } catch (error) {
        console.log(error.message);
    }
}

const returnApprove = async(req,res) =>{
    try {
        
        const { orderId } = req.body;
        const orderData = await Order.findById({_id: orderId});
        const userId = orderData.userId;
        const status = 'Returned';

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
        

        //Change order status to Returned and update Return Reason
        await Order.findOneAndUpdate({_id: orderId},{$set: {orderStatus: status}});

        res.redirect('/admin/orders');

    } catch (error) {
        console.log(error.message);
    }
}

const loadSales = async(req,res) =>{
    try {

        let startDate = req.query.startDate;
        let endDate = req.query.endDate;

        // Validate and convert startDate and endDate to Date objects if provided
        startDate = startDate ? new Date(startDate) : null;
        endDate = endDate ? new Date(endDate) : null;

        // Construct the query object
        const query = {};

        // Add date range to the query if provided
        if (startDate && endDate) {
            query.orderedDate = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            query.orderedDate = { $gte: startDate };
        } else if (endDate) {
            query.orderedDate = { $lte: endDate };
        }

        const ordersData = await Order.find(query).populate( 'userId' ).populate( 'items.productId' ).populate( 'address' );
        // Determine the format of the response (HTML or PDF)
        const format = req.query.format || 'html';

        // Render generateExcel  or generatePDF based on the format
        if (format === 'pdf') {
            generatePDF(ordersData, res);
        } else if (format === 'excel') {
            generateExcel(ordersData, res);
        } else {
            res.render('sales', { 
                orders: ordersData,
                formData: { startDate, endDate } // Retain form data 
            });
        }

        // res.render('sales',{orders: ordersData});
    
    } catch (error) {
        console.log(error.message);
    }
}

const generatePDF = async (ordersData, res) => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Calculate total revenue for confirmed orders
    const totalRevenueConfirmed = ordersData
        .filter(order => order.orderStatus === 'Confirmed')
        .reduce((sum, order) => sum + order.totalPrice, 0);

    // HTML content generation
    const htmlContent = `
        <html>
            <head>
                <style>
                    table {
                        border-collapse: collapse;
                        width: 100%;
                    }
                    th, td {
                        border: 1px solid black;
                        padding: 8px;
                        text-align: left;
                    }
                </style>
            </head>
            <body>
                <h1>Sales Report</h1>
                <p>Total Revenue Generated: Rs.${totalRevenueConfirmed}</p>
                <table>
                    <tr>
                        <th>Order ID</th>
                        <th>Ordered Date</th>
                        <th>User Name</th>
                        <th>Total Price</th>
                        <th>Payment Method</th>
                        <th>Order Status</th>
                        <th>Delivery Status</th>
                    </tr>
                    ${ordersData.map(order => `
                        <tr>
                            <td>${order._id}</td>
                            <td>${order.orderedDate.toDateString()}</td>
                            <td>${order.userId.name}</td>
                            <td>Rs.${order.totalPrice}</td>
                            <td>${order.paymentMethod}</td>
                            <td>${order.orderStatus || 'Pending'}</td>
                            <td>${order.deliveryStatus}</td>
                        </tr>
                    `).join('')}
                </table>
            </body>
        </html>
    `;

    // Set content and generate PDF
    await page.setContent(htmlContent);
    const pdfFile = path.join(__dirname, 'sales.pdf');
    await page.pdf({ path: pdfFile, format: 'A4' });

    await browser.close();

    // Serve or download the generated PDF
    res.download(pdfFile, 'sales.pdf', (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error'); // Handle the error appropriately
        }

        // Remove the generated PDF file after sending it
        fs.unlinkSync(pdfFile);
    });
};


const generateExcel = async (ordersData, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales');

    // Add headers
    worksheet.addRow([
        'Order ID',
        'Ordered Date',
        'User Name',
        'Total Price',
        'Payment Method',
        'Order Status',
        'Delivery Status',
        // ... add more headers as needed
    ]);

    // Add data rows
    ordersData.forEach((order) => {
        worksheet.addRow([
            order._id,
            order.orderedDate.toDateString(),
            order.userId.name,
            order.totalPrice,
            order.paymentMethod,
            order.orderStatus || 'Pending',
            order.deliveryStatus,
            // ... add more data fields as needed
        ]);
    });

    const excelBuffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sales.xlsx"');
    res.send(excelBuffer);
};
  

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
    updateDeliveryStatus,
    getReturnApprove,
    returnApprove,
    loadSales,
    downloadInvoice

}