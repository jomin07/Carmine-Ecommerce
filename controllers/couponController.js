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

const getEditCoupon = async(req,res) =>{
    try {
        const id = req.query.id;
        const couponData = await Coupon.findById({_id: id});

        if (couponData) {
            res.render('edit-coupon',{coupon: couponData});
        } else {
            res.redirect('/admin/coupons');
        }

    } catch (error) {
        console.log(error.message);
    }
}

const editCoupon = async(req,res) =>{
    try {

        const couponId = req.body.couponId;
        const newName = req.body.name;
        const {description,startingDate,expiryDate,minimumAmount,discount,discountType,limit} = req.body;

        // Check if the new name is the same as the existing one
        const existingCoupon = await Coupon.findOne({ name: newName });

        if (existingCoupon && existingCoupon._id.toString() !== couponId) {
            return res.render('edit-coupon', {
                coupon: { _id: couponId, name: newName },
                message: 'coupon already exists'
            });
        }

        // Update the coupon name
        const couponData = await Coupon.findByIdAndUpdate(
            { _id: couponId },
            { $set: { name: newName,description: description,startingDate: startingDate,expiryDate: expiryDate,minimumAmount: minimumAmount,discount: discount,discountType: discountType,limit: limit} }
        );

        res.redirect('/admin/coupons');
   
    } catch (error) {
        console.log(error.message);
    }
}

const listCoupon = async(req,res) =>{
    try {
        const id = req.query.id;
        const couponData = await Coupon.findById(id);
        await couponData.updateOne({$set: {status: true}});

        res.redirect('/admin/coupons');
   
    } catch (error) {
        console.log(error.message);
    }
}

const unListCoupon = async(req,res) =>{
    try {
        const id = req.query.id;
        const couponData = await Coupon.findById(id);
        await couponData.updateOne({$set: {status: false}});

        res.redirect('/admin/coupons');
   
    } catch (error) {
        console.log(error.message);
    }
}

const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        // const amount = Number(req.body.amount);

        // Remove non-numeric characters, including ₹ symbol, from the amount
        const amountString = req.body.amount.replace(/[^\d.]/g, ''); // Remove non-numeric characters, including ₹ symbol
        const amount = Number(amountString);
        console.log('amount is',amount);
        const userId = req.session.user_id;
        const userExist = await Coupon.findOne({ name: code, users: { $in: [userId] } });

        if (userExist) {
            res.json({ user: true });
        } else {
            const couponData = await Coupon.findOne({ name: code });
            console.log(couponData);
            
            if (couponData) {
                if (couponData.limit <= 0) {
                    res.json({ limit: true });
                } else {
                    if (couponData.status == false) {
                        res.json({ status: true })
                    } else {
                        if (couponData.expiryDate <= new Date()) {
                            res.json({ date: true });
                        } else {
                            if (couponData.minimumAmount >= amount) {
                                res.json({ cartAmount: true });
                            } else {
                                await Coupon.findByIdAndUpdate({ _id: couponData._id }, { $push: { users: userId } });
                                await Coupon.findByIdAndUpdate({ _id: couponData._id }, { $inc: { limit: -1 } });
                                if (couponData.discountType == "fixed-amount") {
                                    const disAmount = couponData.discount;
                                    const disTotal = Math.round(amount - disAmount);
                                    return res.json({ amountOkey: true, disAmount, disTotal });
                                } else if (couponData.discountType == "percentage") {
                                    const perAmount = (amount * couponData.discount) / 100;
                                    const maxDiscountAmount = 1000;
                                    if (perAmount <= maxDiscountAmount) {
                                        const disAmount = perAmount;
                                        const disTotal = Math.round(amount - disAmount);
                                        console.log('disAmount is:',disAmount);
                                        console.log('disTotal is:',disTotal);
                                        return res.json({ amountOkey: true, disAmount, disTotal });
                                    }
                                } else {
                                    const disAmount = maxDiscountAmount;
                                    const disTotal = Math.round(amount - disAmount);
                                    return res.json({ amountOkey: true, disAmount, disTotal });
                                }
                            }
                        }
                    }
                }
            } else {
                res.json({ invalid: true });
            }
        }

    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {

    loadCoupons,
    loadAddCoupon,
    addCoupon,
    getEditCoupon,
    editCoupon,
    listCoupon,
    unListCoupon,
    applyCoupon

}