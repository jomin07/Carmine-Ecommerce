const mongoose = require('mongoose');

const couponSchema = mongoose.Schema({
    name : {
        type : String,
        required : true
    },

    description : {
        type : String
    },

    startingDate : {
        type : Date,
        required : true
    },
    
    expiryDate : {
        type : Date,
        required : true
    },

    minimumAmount : {
        type : Number,
        required : true
    },

    discount : {
        type : Number,
        required : true
    },

    discountType : {
        type : String,
        required : true
    },

    status : {
        type : Boolean,
        default : true
    },

    limit: {
        type:Number,
        required:true,
    },

    users : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User'
    }]
});

module.exports = mongoose.model('Coupon',couponSchema);