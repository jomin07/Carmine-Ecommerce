const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name:{
        type: Number,
        required: true
    },
    status:{
        type: Boolean,
        required: true,
        default: true
    }
});

module.exports = mongoose.model('Category',categorySchema);