const dotenv = require('dotenv');
dotenv.config();
const User = require('../models/userModel');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const session = require('express-session');
const randomstring = require('randomstring');
const config = require('../config/config');
const userHelper = require('../helpers/userHelper');

const securePassword = async(password) =>{
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
}

const loadRegister = async(req,res) =>{
    try{
        res.render('registration');
    }catch(error){
        console.log(error.message);
    }
}

//OTP

let email;
let otp;
let otpTimestamp;
let recipientEmail;

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    service: 'Gmail',
    auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.USER_PASSWORD,
    }
});

const sendOtp = async(req, res)=> {
    email = req.body.email;
    recipientEmail = email;
    
    // Generate a new OTP and set the timestamp
    otp = Math.floor(Math.random() * 1000000);
    otpTimestamp = Date.now();
    try {
    
        // send mail with defined transport object
        let mailOptions = {
            from: "carmine@gmail.com",
            to: email,
            subject: "Otp for registration is: ",
            html: "<h3>OTP for account verification is </h3>" + "<h1 style='font-weight:bold;'>" + otp + "</h1>" // html body
        };

        transporter.sendMail(mailOptions,(error, info) => {
            if (error) {
                return console.log(error);
            }
        });
        // transporter.sendMail(mailOptions, function (error, info) {
        //     if (error) {
        //         console.log(error)
        //     } else {
        //         console.log('Mail has been sent succesfully', info.response)
        //     }

        // });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}

const verifyOtp = async(req, res)=> {
    const currentTimestamp = Date.now();

    // Check if the OTP is still valid (e.g., within a 5-minute window)
    const otpValidityDuration = 1 * 60 * 1000; // 1 minute in milliseconds

    try {
        if (req.body.otp == otp && currentTimestamp - otpTimestamp <= otpValidityDuration) {
            const updateInfo = await User.updateOne({ email: recipientEmail},{$set: {isVerified: 1}});

            // res.redirect('/login');
            res.json({ success: true, message: 'Verification successful' });
        } else {
            // res.render('registration-confirmation', { message: 'OTP is incorrect' });
            res.json({ success: false, message: 'OTP is incorrect'  });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

const resendOtp = async(req, res)=> {
    try {
        // Generate a new OTP and set the timestamp
        otp = Math.floor(Math.random() * 1000000);
        otpTimestamp = Date.now();
        
        // send mail with defined transport object
        let mailOptions = {
            from: "carmine@gmail.com",
            to: recipientEmail,
            subject: "Otp for registration is: ",
            html: "<h3>OTP for account verification is </h3>" + "<h1 style='font-weight:bold;'>" + otp + "</h1>" // html body
        };

        transporter.sendMail(mailOptions,(error, info) => {
            if (error) {
                return console.log(error);
            }
            
            res.render('registration-confirmation',{message:'New OTP has been sent.Please Verify Your Mail'});
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}

const insertUser = async(req,res) =>{
    try {
        const secPassword = await securePassword(req.body.password);
        const existingUser = await User.findOne({ email: req.body.email });
        const enteredReferralCode = req.body.referral;

        if (existingUser) { 
            return res.render('registration', {
                 message: "Email already exists, try another one",
                 formData: req.body // Retain form data 
            });
        }

        const referralCode = await userHelper.generateReferralCode();

        const user = new User({
            name:req.body.name,
            email:req.body.email,
            mobile:req.body.mno,
            password:secPassword,
            isAdmin:0,
            referralCode:referralCode
        });

        const userData = await user.save();

        // Check if the enteredReferralCode is valid
        if (enteredReferralCode) {
            const validReferralCode = await userHelper.isValidReferralCode(enteredReferralCode);

            if (validReferralCode) {

                await User.updateOne(
                    { email: req.body.email },
                    {
                        $inc: {
                            wallet: 40
                        },
                        $push: {
                            walletHistory: {
                                date: Date.now(),
                                amount: 40,
                                message: 'Join bonus'
                            }
                        },
                        $set: {
                            isReferred: true
                        }
                    }
                );

                await User.updateOne({ referralCode : enteredReferralCode },{
                    $inc : {
                        wallet : 100
                    },
                    $push : {
                        walletHistory : {
                            date : Date.now(),
                            amount : 100,
                            message : 'Referral bonus'
                        }
                    }
                });

            }
        }

        if (userData) {
            await sendOtp(req, res);
            res.render('registration-confirmation',{message:'Registration Successfull.Please Verify Your Mail'});
        } else {
            res.render('registration',{message:'Registration Failed'});
        }

    } catch (error) {
        console.log(error.message);
    }
}

const loginLoad = async(req,res) =>{
    try {
        res.render('login');
    } catch (error) {
        console.log(error.message);
    }
}

const verifyLogin = async(req,res) =>{
    try {

        const email = req.body.email;
        const password = req.body.password;
        const userData = await User.findOne({email:email});

        if(userData){
            const passwordMatch = await bcrypt.compare(password,userData.password);
            if(passwordMatch && userData.isAdmin === 0 && userData.isBlocked === 0){
                if (userData.isVerified === 0) {
                    res.render('login',{message:"Please Verify Your Mail"});
                } else {
                    req.session.user_id = userData._id;
                    res.redirect('/home');
                }
            }
            else{
                res.render('login',{message:"Invalid Username and password"});
            }
        }
        else{
            res.render('login',{message:"Invalid Username and password"});
        }
    } catch (error) {
        console.log(error.message);
    }
}

const loadHome = async(req,res) =>{
    try {
        const userData = await User.findById({_id:req.session.user_id});
        const latestProducts = await Product.find({status: true}).sort({_id: -1}).limit(8).populate('category');
        const featuredProducts = await Product.find({isFeatured: true,status: true}).limit(8).populate('category');
        const productsData = await Product.find({status: true}).populate('category');
        const categoriesData = await Category.find({status: true});

        if (userData) {
            res.render('home',{user: userData,latestProducts,featuredProducts}); 
        }
        else {
            res.render('home',{latestProducts,featuredProducts}); 
        }
        

    } catch (error) {
        console.log(error.message);
    }
}

const getLanding = async(req,res) =>{
    try {
        const latestProducts = await Product.find({status: true}).sort({_id: -1}).limit(8).populate('category');
        const featuredProducts = await Product.find({isFeatured: true,status: true}).limit(8).populate('category');
        const productsData = await Product.find({status: true}).populate('category');
        const categoriesData = await Category.find({status: true});
             
        res.render('home',{latestProducts,featuredProducts});
        
    } catch (error) {
        console.log(error);
    }
}

const getProfile = async(req,res) =>{
    try {

        const userData = await User.findById({_id:req.session.user_id});

        if (userData) {
            res.render('profile',{user: userData}); 
        }
        else {
            res.render('profile'); 
        }

    } catch (error) {
        
        console.log(error.message);
    }
}

const getProfileEdit = async(req,res) =>{
    try {
        const id = req.query.id;
        const userData = await User.findById({_id: id});

        if (userData) {
            res.render('profile-edit',{user:userData});
        } else {
            res.redirect('/profile');
        }

    } catch (error) {
        console.log(error.message);
    }
}

const editProfile = async(req,res) =>{
    try {
        
        // const userData = await User.findByIdAndUpdate({_id: req.body.user_id},{$set: {name: req.body.name,email: req.body.email,mobile: req.body.mno}});

        const userId = req.body.user_id;
        const newEmail = req.body.email;

        // Fetch user data
        const userData = await User.findById({ _id: userId });
        const existingUser = await User.findOne({ email: newEmail });

        // Check if the email already exists and belongs to a different user
        if (existingUser && existingUser._id.toString() !== userId) {
            return res.render('profile-edit', { 
                user: userData,
                message: "Email already exists, try another one",
                formData: req.body // Retain form data 
            });
        } else {
            // Update user data
            await User.findByIdAndUpdate({ _id: userId }, { $set: { name: req.body.name, email: newEmail, mobile: req.body.mno } });
        }
        

        res.redirect('/profile');

    } catch (error) {
        console.log(error.message);
    }
}

const getAddress = async(req,res) =>{
    try {

        const userId = req.session.user_id;
        const userData = await User.findById({_id:req.session.user_id});
        const addressData = await Address.find({user: userId,status: true}).populate('user');
        res.render('addresses',{user: userData,address: addressData});

    } catch (error) {
        console.log(error.message);
    }
}

const getAddAddress = async(req,res) =>{
    try {

        const userData = await User.findById({_id:req.session.user_id});
        res.render('add-address',{user: userData});

    } catch (error) {
        console.log(error.message);
    }
}

const addAddress = async(req,res) =>{
    try {
        
        const address = new Address({
            name: req.body.name,
            mobile: req.body.mno,
            pincode: req.body.pincode,
            user: req.session.user_id,
            locality: req.body.locality,
            address: req.body.address,
            city: req.body.city,
            state: req.body.state,
            country: req.body.country,
            landmark: req.body.landmark,
        });

        const addressData = await address.save();

        if (addressData) {
            res.redirect('/profile/addresses');
        } else {
            res.render('add-address',{message:'Something Wrong'});
        }

    } catch (error) {
        console.log(error.message);
    }
}

const getEditAddress = async(req,res) =>{
    try {
        const id = req.query.id;
        const userData = await User.findById({_id:req.session.user_id});
        const addressData = await Address.findById(id);

        res.render('edit-address',{address: addressData,user: userData});

    } catch (error) {
        console.log(error.message);
    }
}

const editAddress = async(req,res) =>{
    try {
        const addressData = await Address.findByIdAndUpdate({_id: req.body.addressId},{$set: {name: req.body.name,mobile: req.body.mno,pincode: req.body.pincode,locality: req.body.locality,address: req.body.address,city: req.body.city,state: req.body.state,country: req.body.country,landmark: req.body.landmark}});

        res.redirect('/profile/addresses');

    } catch (error) {
        console.log(error.message);
    }
}

const removeAddress = async ( req, res ) => {
    try {
        
        const id = req.query.id;
        const addressData = await Address.findById(id);
        await addressData.updateOne({$set: {status: false}});

        res.redirect('/profile/addresses');

    } catch (error) { 
        console.log(error.message);
    }
}


const sendResetPasswordMail = async(name,email,token)=> {
    
    try {
    
        // send mail with defined transport object
        let mailOptions = {
            from: "carmine@gmail.com",
            to: email,
            subject: "For Password Reset",
            html: `Hi ${name}, <a href="http://127.0.0.1:5000/reset-password?token=${token}"> Click here </a> to reset your password`
           
        };

        transporter.sendMail(mailOptions,(error, info) => {
            if (error) {
                return console.log(error);
            }
        });
       
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}

const getForgetPassword = async(req,res) =>{
    try {
        
        res.render('forget-password');

    } catch (error) {
        console.log(error.message);
    }
}

const forgetPassword = async(req,res) =>{
    try {
        
        const email = req.body.email;
        const userData = await User.findOne({email: email});

        if (userData) {
            
            if (userData.isVerified == 0) {

                res.render('forget-password',{message: 'Please Verify Your Mail'});

            } else {
                
                const randomString = randomstring.generate();
                const updatedUserData = await User.updateOne({email: email},{$set: {token: randomString}});
                sendResetPasswordMail(userData.name,userData.email,randomString);
                res.render('forget-password',{message: 'Please check your mail to reset your Password'});

            }
            
        } else {
            
            res.render('forget-password',{message: 'Invalid Email'});

        }

    } catch (error) {
        console.log(error.message);
    }
}

const getResetPassword = async(req,res) =>{
    try {

        const token = req.query.token;
        const tokenData = await User.findOne({token: token});

        if (tokenData) {
            
            res.render('reset-password',{user_id: tokenData._id});
        } else {
            
            res.render('forget-password',{message: 'Invalid Token'});
        }
        
    } catch (error) {
        console.log(error.message);
    }
}

const resetPassword = async(req,res) =>{
    try {
        
        const password = req.body.password;
        const user_id = req.body.user_id;

        const secureNewPassword = await securePassword(password);
        const updatedUserData = await User.findByIdAndUpdate({_id: user_id},{$set: {password: secureNewPassword,token:''}});

        res.redirect('/');
        
    } catch (error) {
        console.log(error.message);
    }
}


const userLogout = async(req,res) =>{
    try {
        req.session.destroy();
        res.redirect('/');
    } catch (error) {
        console.log(error.message);
    }
}

const getShop = async(req,res) =>{
    try {
        
        if(!req.session.user_id){

            const productsData = await Product.find({status: true}).populate('category');
            const categoriesData = await Category.find({status: true});
             
            res.render('shop',{products: productsData,categories: categoriesData}); 

        }

        else{

            const userData = await User.findById({_id:req.session.user_id});
            const productsData = await Product.find({status: true}).populate('category');
            const categoriesData = await Category.find({status: true});
    
            if (userData) {
                res.render('shop',{user: userData,products: productsData,categories: categoriesData}); 
            }
            else {
                res.render('shop',{products: productsData,categories: categoriesData}); 
            }            
        }

    } catch (error) {
        console.log(error);
    }

}

const getSearch = async(req,res) =>{
    try {
        
        const search = req.query.search;
        const productsData = await Product.find({
            $and: [
                {
                    $or: [
                        { name: { $regex: ".*" + search + ".*", $options: 'i' } },
                        { brand: { $regex: ".*" + search + ".*", $options: 'i' } },
                        {
                            category: {
                                $in: await Category.find({ name: { $regex: ".*" + search + ".*", $options: 'i' } }).distinct('_id')
                            }
                        }
                    ]
                },
                { status: true } 
            ]
        }).populate('category');
            
        const categoriesData = await Category.find({status: true});

        if(!req.session.user_id){           
            res.render('shop',{products: productsData,categories: categoriesData}); 
        }
        else{

            const userData = await User.findById({_id:req.session.user_id});
             
            if (userData) {
                res.render('shop',{user: userData,products: productsData,categories: categoriesData}); 
            }
            else {
                res.render('shop',{products: productsData,categories: categoriesData}); 
            }            
        }

    } catch (error) {
        console.log(error);
    }

}

const getFilter = async (req, res) => {
    try {
        const { price, category, brand ,sort } = req.query;

        // Define filter conditions based on query parameters
        const filterConditions = {
            $and: [
                { status: true }, // Product is active
            ],
        };

        // Filter by price
        if (price) {
            const [minPrice, maxPrice] = price.split('-').map(value => parseInt(value.replace(/[^\d]/g, ''), 10));
            const priceFilter = {};
            if (minPrice) priceFilter.$gte = parseInt(minPrice);
            if (maxPrice) priceFilter.$lte = parseInt(maxPrice);

            filterConditions.$and.push({ price: priceFilter });
        }

        // Filter by category
        if (category) {
            const categoryId = await Category.findOne({ name: category }).select('_id');
        
            filterConditions.$and.push({ category: categoryId });
        }

        // Filter by brand
        if (brand) {
            filterConditions.$and.push({ brand: brand });
        }

        // Sorting
        let sortOption = {};
        if (sort === 'lowToHigh') {
            sortOption = { price: 1 }; // Ascending order
        } else if (sort === 'highToLow') {
            sortOption = { price: -1 }; // Descending order
        }

        const productsData = await Product.find(filterConditions).populate('category').sort(sortOption);
        const categoriesData = await Category.find({ status: true });

        if (!req.session.user_id) {
            res.render('shop', { products: productsData, categories: categoriesData });
        } else {
            const userData = await User.findById({ _id: req.session.user_id });

            if (userData) {
                res.render('shop', { user: userData, products: productsData, categories: categoriesData });
            } else {
                res.render('shop', { products: productsData, categories: categoriesData });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


const getProductDetails = async(req,res) =>{
    try {

        if(!req.session.user_id){

            const id = req.params.id;
            const productData = await Product.findById({_id: id}).populate('category');
     
            res.render('product-details',{product: productData});

        }

        else{

            const id = req.params.id;
            const userData = await User.findById({_id:req.session.user_id});
            const productData = await Product.findById({_id: id}).populate('category');
            
            if (userData && productData) {
                res.render('product-details',{user: userData,product: productData}); 
            }
            else if (productData) {
                res.render('product-details',{product: productData});
            
            } else {
                res.redirect('/shop');
            }

        }

    } catch (error) {
        
        console.log(error.message);
    }
}

const getWallet = async(req,res) =>{
    try { 

        const userData = await User.findById({_id: req.session.user_id});

        res.render('wallet',{user: userData});

    } catch (error) {
        
        console.log(error.message);
    }
}

const getAbout = async(req,res) =>{
    try{

        if(!req.session.user_id){

            res.render('about'); 

        }
        else{

            const userData = await User.findById({_id:req.session.user_id});
    
            if (userData) {
                res.render('about',{user: userData}); 
            }
            else {
                res.render('about'); 
            }           
        }
        
    }catch(error){
        console.log(error.message);
    }
}

const getBlog = async(req,res) =>{
    try{

        if(!req.session.user_id){

            res.render('blog'); 

        }
        else{

            const userData = await User.findById({_id:req.session.user_id});
    
            if (userData) {
                res.render('blog',{user: userData}); 
            }
            else {
                res.render('blog'); 
            }           
        }
        
    }catch(error){
        console.log(error.message);
    }
}

module.exports = {
    loadRegister,
    insertUser,
    sendOtp,
    verifyOtp,
    resendOtp,
    loginLoad,
    verifyLogin,
    loadHome,
    getLanding,
    getProfile,
    getProfileEdit,
    editProfile,
    getAddress,
    getAddAddress,
    addAddress,
    getEditAddress,
    editAddress,
    removeAddress,
    getForgetPassword,
    forgetPassword,
    getResetPassword,
    resetPassword,
    userLogout,
    getShop,
    getProductDetails,
    getSearch,
    getFilter,
    getWallet,
    getAbout,
    getBlog
}
