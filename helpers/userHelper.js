const mongoose = require('mongoose');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel'); 

async function cartTotalMRP(userId) {
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
            // throw new Error('Cart not found');
            return 0;
        }

        return totalPriceResult[0].totalPrice;
    } catch (error) {
        console.error('Error calculating total price:', error.message);
        throw error;
    }
}

// async function cartTotalPrice(userId) {
//     try {
//         const totalPriceResult = await Cart.aggregate([
//             { $match: { userId: new mongoose.Types.ObjectId(userId) } },
//             { $unwind: '$items' },
//             {
//                 $lookup: {
//                     from: 'products',
//                     localField: 'items.productId',
//                     foreignField: '_id',
//                     as: 'productDetails'
//                 }
//             },
//             { $unwind: '$productDetails' },
//             {
//                 $group: {
//                     _id: null,
//                     totalPrice: {
//                         $sum: {
//                             $multiply: [
//                                 {
//                                     $subtract: [
//                                         '$productDetails.price',
//                                         {
//                                             $multiply: [
//                                                 '$productDetails.price',
//                                                 {
//                                                     $divide: [
//                                                         { $ifNull: ['$productDetails.offer', 0] },
//                                                         100
//                                                     ]
//                                                 }
//                                             ]
//                                         }
//                                     ]
//                                 },
//                                 '$items.quantity'
//                             ]
//                         }
//                     }
//                 }
//             }
//         ]);

//         if (totalPriceResult.length === 0) {
//             return 0;
//         }

//         return totalPriceResult[0].totalPrice;
//     } catch (error) {
//         console.error('Error calculating total price:', error.message);
//         throw error;
//     }
// }

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
                $lookup: {
                    from: 'categories',
                    localField: 'productDetails.category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: null,
                    totalPrice: {
                        $sum: {
                            $multiply: [
                                {
                                    $subtract: [
                                        '$productDetails.price',
                                        {
                                            $add: [
                                                {
                                                    $multiply: [
                                                        '$productDetails.price',
                                                        {
                                                            $divide: [
                                                                { $ifNull: ['$productDetails.offer', 0] },
                                                                100
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    $multiply: [
                                                        '$productDetails.price',
                                                        {
                                                            $divide: [
                                                                { $ifNull: ['$categoryDetails.offer', 0] },
                                                                100
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                '$items.quantity'
                            ]
                        }
                    }
                }
            }
        ]);

        if (totalPriceResult.length === 0) {
            return 0;
        }

        return totalPriceResult[0].totalPrice;
    } catch (error) {
        console.error('Error calculating total price:', error.message);
        throw error;
    }
}

async function cartTotalCount(userId) {
    try {
        const itemCountResult = await Cart.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: null,
                    totalCount: {
                        $sum: '$items.quantity'
                    }
                }
            }
        ]);

        if (itemCountResult.length === 0) {
            return 0;
        }

        return itemCountResult[0].totalCount;
    } catch (error) {
        console.error('Error calculating cart item count:', error.message);
        throw error;
    }
}

async function generateReferralCode() {

    try {
        
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const codeLength = 8; // You can adjust the length of the referral code as needed
        let referralCode = '';
    
        // Generate random characters
        for (let i = 0; i < codeLength; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            referralCode += characters.charAt(randomIndex);
        }
    
        // Add a timestamp to ensure uniqueness
        const timestamp = Date.now();
        referralCode += timestamp.toString().slice(-4); // Use the last 4 digits of the timestamp
    
        return referralCode;

    } catch (error) {
        console.log(error.message);
    }
}

async function isValidReferralCode(enteredReferralCode) {

    try {

        const existingUser = await User.findOne({referralCode: enteredReferralCode});

        // If the user with the entered referral code exists, it's valid
        return !!existingUser;

    } catch (error) {
        console.log(error.message);
        return false;
    }   
}



module.exports = {

    cartTotalMRP,
    cartTotalPrice,
    cartTotalCount,
    generateReferralCode,
    isValidReferralCode

}