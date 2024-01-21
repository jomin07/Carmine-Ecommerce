const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const adminHelper = require('../helpers/adminHelper');

const loadLogin = async(req,res) =>{
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

            if (passwordMatch) {
                
                if (userData.isAdmin === 0) {
                    res.render('login',{message: 'Invalid Username'});
                } else {
                    
                    req.session.admin_id = userData._id;
                    res.redirect('/admin/home');
                }
            } else {
                res.render('login',{message: 'Incorrect password'});
            }
        }
        else{
            res.render('login',{message: 'Invalid Username'});
        }
    } catch (error) {
        console.log(error.message);
    }
}

const loadHome = async(req,res) =>{
    try {

        const bestSellingProducts = await adminHelper.getBestSellingProducts();
        const totalProductsSold = await adminHelper.getTotalProductsSold();
        console.log(totalProductsSold);
        // res.render('home');
        res.render('dashboard',{bestSellingProducts,totalProductsSold});
    } catch (error) {
        console.log(error.message);
    }
}

const loadUsers = async(req,res) =>{
    try {
        
        var search = '';

        if(req.query.search){
            search = req.query.search;
        }
        
        const usersData = await User.find({
            isAdmin:0,
            $or:[
                {name: {$regex:'.*'+search+'.*',$options:'i'}},
                {email: {$regex:'.*'+search+'.*',$options:'i'}},
                {mobile: {$regex:'.*'+search+'.*',$options:'i'}},
            ]
        })
        res.render('users',{users:usersData});
    } catch (error) {
        console.log(error.message);
    }
}

const blockUser = async(req,res) =>{
    try {
        const id = req.query.id;
        const userData = await User.findById(id);
        await userData.updateOne({$set: {isBlocked: 1}});

        res.redirect('/admin/users');
    } catch (error) {
        console.log(error.message);
    }
}

const unblockUser = async(req,res) =>{
    try {
        const id = req.query.id;
        const userData = await User.findById(id);
        await userData.updateOne({$set: {isBlocked: 0}});

        res.redirect('/admin/users');
    } catch (error) {
        console.log(error.message);
    }
}

const logout = async(req,res) =>{
    try {
        req.session.destroy();
        res.redirect('/admin');
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    loadLogin,
    verifyLogin,
    loadHome,
    loadUsers,
    blockUser,
    unblockUser,
    logout
}