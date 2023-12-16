const Category = require('../models/categoryModel');

const loadCategories = async(req,res) =>{
    try {
        const categoriesData = await Category.find({});
        res.render('categories',{categories: categoriesData});
    
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

const insertCategory = async(req,res) =>{
    try {
        const existingCategory = await Category.findOne({name: req.body.name});
        const existingCategoryName = existingCategory.name.toLowerCase();
        const newCategoryName = req.body.name.toLowerCase();

        if(existingCategoryName === newCategoryName){
            return res.render('add-category',{message: 'Category already exists'});
            // req.flash('error','Category already exists');
            // res.redirect('/admin/categories/add-category');
        }

        const category = new Category({
            name: req.body.name,
            status: true
        });

        const categoryData = await category.save();

        if (categoryData) {
            res.redirect('/admin/categories');
        } else {
            return res.render('add-category',{message: 'Category adding failed'});
        }
        
    
    } catch (error) {
        console.log(error.message);
    }
}

const editCategory = async(req,res) =>{
    try {
        const id = req.query.id;
        const categoryData = await Category.findById({_id: id});

        if (categoryData) {
            res.render('edit-category',{category: categoryData});
        } else {
            res.redirect('/admin/categories');
        }

    } catch (error) {
        console.log(error.message);
    }
}

const updateCategory = async(req,res) =>{
    try {
        const categoryData = await Category.findByIdAndUpdate({_id: req.body.categoryId},{$set: {name: req.body.name}});
        res.redirect('/admin/categories');
   
    } catch (error) {
        console.log(error.message);
    }
}

const listCategory = async(req,res) =>{
    try {
        const id = req.query.id;
        const categoryData = await Category.findById(id);
        await categoryData.updateOne({$set: {status: true}});

        res.redirect('/admin/categories');
   
    } catch (error) {
        console.log(error.message);
    }
}

const unListCategory = async(req,res) =>{
    try {
        const id = req.query.id;
        const categoryData = await Category.findById(id);
        await categoryData.updateOne({$set: {status: false}});

        res.redirect('/admin/categories');
   
    } catch (error) {
        console.log(error.message);
    }
}

const deleteCategory = async(req,res) =>{
    try {
        
        const id = req.query.id;
        await Category.deleteOne({_id: id});
        res.redirect('/admin/categories');
    
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    loadCategories,
    loadAddCategory,
    insertCategory,
    editCategory,
    updateCategory,
    listCategory,
    unListCategory,
    deleteCategory
}