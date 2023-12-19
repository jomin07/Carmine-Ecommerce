const Product = require('../models/productModel');
const Category = require('../models/categoryModel');

module.exports = {

    getallproducts: () => {

        return new Promise((resolve, reject) => {
            Product.find({}).then((data) => {
                resolve(data);
            });
        });

    },

    getcategory: () => {

        return new Promise((resolve, reject) => {

            Category.find({}).then((cat) => {

                resolve(cat);
            })

        })
    }

    
}