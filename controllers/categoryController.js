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

        if(existingCategory){ 

            return res.render('add-category',{
                message: 'Category already exists',
                formData: req.body // Retain form data
            });
            
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
        // const categoryData = await Category.findByIdAndUpdate({_id: req.body.categoryId},{$set: {name: req.body.name}});
        // res.redirect('/admin/categories');

        const categoryId = req.body.categoryId;
        const newName = req.body.name;

        // Check if the new name is the same as the existing one
        const existingCategory = await Category.findOne({ name: newName });

        if (existingCategory && existingCategory._id.toString() !== categoryId) {
            return res.render('edit-category', {
                category: { _id: categoryId, name: newName },
                message: 'Category already exists'
            });
        }

        // Update the category name
        const categoryData = await Category.findByIdAndUpdate(
            { _id: categoryId },
            { $set: { name: newName } }
        );

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