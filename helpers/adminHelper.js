const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');

async function getTotalUsers() {
    try {
        const totalUsers = await User.countDocuments();
        return totalUsers;
    } catch (error) {
        console.error(error.message);
        return 0; // Default to 0 in case of an error
    }
}

async function getTotalProductsSold() {
    try {
        // Aggregate orders to find the total number of products sold with orderStatus as Confirmed
        const result = await Order.aggregate([
            {
                $match: {
                    orderStatus: 'Confirmed'
                }
            },
            {
                $unwind: '$items'
            },
            {
                $group: {
                    _id: null,
                    totalQuantity: { $sum: '$items.quantity' }
                }
            }
        ]);

        if (result.length > 0) {
            return result[0].totalQuantity;
        }

        return 0; // Default to 0 if no confirmed orders are found
    } catch (error) {
        console.log(error.message);
        return 0; // Default to 0 in case of an error
    }
}


async function getTotalMoneyGenerated() {
    try {
        const result = await Order.aggregate([
            {
                $match: {
                    orderStatus: 'Confirmed'
                }
            },
            {
                $group: {
                    _id: null,
                    totalMoney: { $sum: '$totalPrice' }
                }
            }
        ]);

        if (result.length > 0) {
            return result[0].totalMoney;
        }

        return 0; // Default to 0 if no confirmed orders are found
    } catch (error) {
        console.error(error.message);
        return 0; // Default to 0 in case of an error
    }
}

async function getBestSellingProducts() {
    try {
        // Aggregate confirmed orders to find the most selling product
        const result = await Order.aggregate([
            {
                $match: {
                    orderStatus: 'Confirmed'
                }
            },
            {
                $unwind: '$items'
            },
            {
                $group: {
                    _id: '$items.productId',
                    totalQuantity: { $sum: '$items.quantity' }
                }
            },
            {
                $sort: { totalQuantity: -1 }
            },
            {
                $limit: 5
            }
        ]);

        if (result.length > 0) {
            // Fetch product details for the top 5 best-selling products
            const topSellingProducts = await Promise.all(result.map(async (item) => {
                const productDetails = await Product.findById(item._id);
                return {
                    product: productDetails,
                    totalQuantity: item.totalQuantity
                };
            }));

            return topSellingProducts;
        }

        return null;
    } catch (error) {
        console.log(error.message);
        return null;
    }
}


async function getConfirmedOrdersWithDeliveryStatus() {
    try {
        // Aggregate orders to group by deliveryStatus
        const result = await Order.aggregate([
            {
                $match: {
                    orderStatus: 'Confirmed'
                }
            },
            {
                $group: {
                    _id: '$deliveryStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        const labels = result.map(item => item._id || 'Not Specified');
        const data = result.map(item => item.count);

        return { labels, data };
    } catch (error) {
        console.log(error.message);
        return { labels: [], data: [] }; // Default to empty arrays in case of an error
    }
}


module.exports = {

    getTotalUsers,
    getTotalProductsSold,
    getTotalMoneyGenerated,
    getBestSellingProducts,
    getConfirmedOrdersWithDeliveryStatus

}