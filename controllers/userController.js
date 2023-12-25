const dotenv = require('dotenv');
dotenv.config();
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const session = require('express-session');

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
    console.log(email);
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
            console.log('Message sent: %s', info.messageId);
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            console.log(otp);
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
            console.log(email);
            console.log(updateInfo);
            res.redirect('/login');
        } else {
            res.render('registration-confirmation', { message: 'OTP is incorrect' });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const resendOtp = async(req, res)=> {
    try {
        // Generate a new OTP and set the timestamp
        otp = Math.floor(Math.random() * 1000000);
        otpTimestamp = Date.now();
        console.log('inside resend');
        console.log(recipientEmail);
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
            console.log('Message sent: %s', info.messageId);
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            console.log(otp);
            res.render('registration-confirmation',{message:'Registration Successfull.Please Verify Your Mail'});
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

        if (existingUser) { 
            return res.render('registration', { message: "Email already exists, try another one" });
        }

        const user = new User({
            name:req.body.name,
            email:req.body.email,
            mobile:req.body.mno,
            password:secPassword,
            isAdmin:0
        });

        const userData = await user.save();

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

        if (userData) {
            res.render('home',{user: userData}); 
        }
        else {
            res.render('home'); 
        }
        

    } catch (error) {
        console.log(error.message);
    }
}

const getLanding = async(req,res) =>{
    try {
        res.render('home');
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
        
        const userData = await User.findByIdAndUpdate({_id: req.body.user_id},{$set: {name: req.body.name,email: req.body.email,mobile: req.body.mno}});

        res.redirect('/profile');

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
        
        const userData = await User.findById({_id:req.session.user_id});
        const productsData = await Product.find({status: true}).populate('category');
        const categoriesData = await Category.find({status: true});

        if (userData) {
            res.render('shop',{user: userData,products: productsData,categories: categoriesData}); 
        }
        else {
            res.render('shop',{products: productsData,categories: categoriesData}); 
        }
        
        

    } catch (error) {
        console.log(error);
    }

}

const getProductDetails = async(req,res) =>{
    try {
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
        
    } catch (error) {
        
        console.log(error.message);
    }
}

const getWishList = async(req,res) =>{
    try {
        
        res.render('wishlist');

    } catch (error) {
        
        console.log(error.message);
    }
}

const getCartPage = async(req,res) =>{
    try {
        
        res.render('cart');
        
    } catch (error) {
        
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
    userLogout,
    getShop,
    getProductDetails,
    getWishList,
    getCartPage
}
