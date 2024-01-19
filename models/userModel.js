const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    
    name:{
        type:String,
        required:true
    },

    email:{
        type:String,
        required:true
    },

    mobile:{
        type:String,
        required:true
    },

    password:{
        type:String,
        required:true
    },

    isAdmin:{
        type:Number,
        required:true
    },

    isVerified:{
        type:Number,
        default:0
    },

    isBlocked:{
        type:Number,
        default:0
    },

    token: {
        type: String,
        default: ''
    },

    wallet: {
        type : Number,
        default : 0
    },

    walletHistory : [{
        date : {
            type : Date,
        },
        amount : {
            type : Number
        },
        message : {
            type : String
        }

    }],
    
    referralCode : {
        type : String
    },

    isReferred : {
        type: Boolean,
        default: false
    }
    
});

module.exports = mongoose.model('User',userSchema);