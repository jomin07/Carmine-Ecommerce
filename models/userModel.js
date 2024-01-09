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
    }
    
});

module.exports = mongoose.model('User',userSchema);