const Coupon = require('../models/couponModel');

const loadCoupons = async(req,res) =>{
    try {
        const couponsData = await Coupon.find({});
        res.render('coupons',{coupons: couponsData});
    
    } catch (error) {
        console.log(error.message);
    }
}

const loadAddCoupon = async(req,res) =>{
    try {
        res.render('add-coupon');
    
    } catch (error) {
        console.log(error.message);
    }
}

const addCoupon = async(req,res) =>{
    try {
        
        const { name, description, startingDate, expiryDate, minimumAmount, discountType, discount,limit } = req.body;
        const exist = await Coupon.findOne({name: name.toUpperCase()});
        if (exist) {
            
            console.log('exist');
            return res.render('/coupons/add-coupon',{message: 'Coupon already exists'});

        } 

        const coupon = new Coupon({
            name: name.toUpperCase(),
            description: description,
            startingDate: startingDate,
            expiryDate: expiryDate,
            minimumAmount: minimumAmount,
            discountType: discountType,
            discount: discount,
            limit: limit
        });

        const couponData = await coupon.save();

        if (couponData) {
            res.redirect('/admin/coupons');
        } else {
            return res.render('add-coupon',{message: 'Coupon adding failed'});
        }
            
    
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {

    loadCoupons,
    loadAddCoupon,
    addCoupon

}