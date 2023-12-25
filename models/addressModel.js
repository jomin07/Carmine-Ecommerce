const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    pincode: {
        type: Number,
        required: true
    },
    locality: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    landmark: {
        type: String
    },
    isDefault: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Address',addressSchema);