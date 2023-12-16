const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    description:{
        type: String,
        required :true
    },
    brand:{
        type: String,
        required: true
    },
    category : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Category', 
        required : true
    },
    quantity : {
        type : Number,
        required : true
    },
    price : {
        type : Number,
        required : true
    },
    image : {
        type : Array,
        required : true
    }, 
    status : {
        type : Boolean,
        default : true
    },
});

module.exports = mongoose.model('Product',productSchema);