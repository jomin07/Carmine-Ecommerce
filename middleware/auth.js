const User = require('../models/userModel');
const isLogin = async(req,res,next) =>{
    try {
        if(req.session.user_id){
            next();
        }
        else{
            res.redirect('/login');
        }
    } catch (error) {
        console.log(error.message);
    }
}

const isBlocked = async(req,res,next) =>{
    try {
        
        if(req.session.user_id){
            const id = req.session.user_id;
            const user = await User.findOne({_id: id});
            if (user.isBlocked == 1) {
                delete req.session.user_id;

                res.redirect('/');

            } else {
                next();
            }
        }
        else{
            next();
        }
        
        
    } catch (error) {
        console.log(error.message);
    }
}

const isLogout = async(req,res,next) =>{
    try {
        if (req.session.user_id) {
            res.redirect('/home');
        } else {
            next();
        }
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    isLogin,
    isBlocked,
    isLogout
}