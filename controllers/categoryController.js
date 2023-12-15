const Category = require('../models/categoryModel');

const loadCategories = async(req,res) =>{
    try {
        res.render('categories');
    } catch (error) {
        console.log(error.message);
    }
}

const loadAddCategory = async(req,res) =>{
    try {
        res.render('add-category');
    } catch (error) {
        console.log(error.message);
    }
}

const loadEditCategory = async(req,res) =>{
    try {
        res.render('edit-category');
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    loadCategories,
    loadAddCategory,
    loadEditCategory
}