const mongoose = require('mongoose');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel'); 

async function cartTotalPrice(userId) {
    try {
        const totalPriceResult = await Cart.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: null,
                    totalPrice: {
                        $sum: { $multiply: ['$productDetails.price', '$items.quantity'] }
                    }
                }
            }
        ]);

        if (totalPriceResult.length === 0) {
            throw new Error('Cart not found');
        }

        return totalPriceResult[0].totalPrice;
    } catch (error) {
        console.error('Error calculating total price:', error.message);
        throw error;
    }
}


module.exports = {

    cartTotalPrice

}