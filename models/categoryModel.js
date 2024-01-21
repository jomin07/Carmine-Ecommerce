const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    status:{
        type: Boolean,
        required: true
    },
    offer:{
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Category',categorySchema);