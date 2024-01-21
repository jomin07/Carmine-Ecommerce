const Order = require('../models/orderModel');
const Product = require('../models/productModel');


async function getTotalProductsSold() {
    try {
        // Aggregate orders to find the total number of products sold
        const result = await Order.aggregate([
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

        return 0; // Default to 0 if no orders are found
    } catch (error) {
        console.log(error.message);
        return 0; // Default to 0 in case of an error
    }
}

async function getBestSellingProducts () {
    try {
        // Aggregate orders to find the most selling product
        const result = await Order.aggregate([
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
};

module.exports = {

    getTotalProductsSold,
    getBestSellingProducts

}