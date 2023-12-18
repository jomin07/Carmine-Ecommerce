const fs = require('fs');
const path = require('path');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');

const loadProducts = async(req,res) =>{
    try {
        const productsData = await Product.find({}).populate('category');
        res.render('products',{products: productsData});
    
    } catch (error) {
        console.log(error.message);
    }
}

const loadAddProduct = async(req,res) =>{
    try {
        const categoriesData = await Category.find({status: true});
        res.render('add-product',{categories: categoriesData});
    
    } catch (error) {
        console.log(error.message);
    }
}

const addProduct = async(req,res) =>{
    try {
        const img = [];

        for(i=0;i<req.files.length;i++){
            img[i] = req.files[i].filename;
        }

        // Find the ObjectId of the selected category
        const selectedCategory = await Category.findOne({ name: req.body.category });
        const categoryId = selectedCategory._id;

        const product = new Product({
            name: req.body.name,
            brand: req.body.brand,
            price: req.body.price,
            category: categoryId,
            description: req.body.description,
            image: img,
            quantity: req.body.quantity,
        });

        const productData = await product.save();

        if (productData) {
            res.redirect('/admin/products');
        } else {
            res.render('add-product',{message:'Something Wrong'});
        }

    } catch (error) {
        console.log(error.message);
    }
}

const editProduct = async(req,res) =>{
    try {
        const id = req.params.id;
        const productData = await Product.findById({_id: id}).populate('category');
        const categoriesData = await Category.find({status: true});

        if (productData) {
            res.render('edit-product',{product: productData,categories: categoriesData});
        } else {
            res.redirect('/admin/products');
        }

    } catch (error) {
        console.log(error.message);
    }
}

const deleteImage = async (req, res) => {
    try {
        const id = req.query.id;
        const image = req.query.imageId;

        await Product.updateOne({ _id : id },{ $pull: {image: image}});
        fs.unlink( path.join( __dirname, '../public/admin/productImages/') + image , ( err ) => {
            if( err ) {
                console.log(err);
            }
        });
        res.redirect(`/admin/products/edit-product/${id}`);
    } catch ( error ) {
        console.log(error.message);

    }
}

const updateProduct = async(req,res) =>{
    try {
            const existingProduct = await Product.findById( req.body.productId );
            
            // Find the ObjectId of the selected category
            const selectedCategory = await Category.findOne({ name: req.body.category });
            const categoryId = selectedCategory._id;

            if( req.files ) {
                for( let file of req.files ) {
                    if( 
                        file.mimetype !== 'image/jpg' &&
                        file.mimetype !== 'image/jpeg' &&
                        file.mimetype !== 'image/png' &&
                        file.mimetype !== 'image/gif'
                    ){
                        return res.redirect(`/admin/edit-product/${existingProduct._id}`);
                    }
                }
                const images = existingProduct.image
                req.files.forEach( element => {
                    images.push( element.filename )
                });
                var img = images
            }
            await Product.updateOne( { _id : req.body.productId },
                {
                    $set : {
                        name : req.body.name,
                        description : req.body.description,
                        brand : req.body.brand,
                        category : categoryId,
                        quantity : req.body.quantity,
                        price : req.body.price,
                        image : img
                    }
                })
            res.redirect( '/admin/products' )
        
        } catch (error) {
        console.log(error.message);
    }
}

const listProduct = async(req,res) =>{
    try {
        const id = req.query.id;
        const productData = await Product.findById(id);
        await productData.updateOne({$set: {status: true}});

        res.redirect('/admin/products');

    } catch (error) {
        console.log(error.message);
    }
}

const unListProduct = async(req,res) =>{
    try {
        const id = req.query.id;
        const productData = await Product.findById(id);
        await productData.updateOne({$set: {status: false}});
        
        res.redirect('/admin/products');

    } catch (error) {
        console.log(error.message);
    }
}

const deleteProduct = async(req,res) =>{
    try {
        const id = req.query.id;
        await Product.deleteOne({_id: id});
        
        res.redirect('/admin/products');

    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    loadProducts,
    loadAddProduct,
    addProduct,
    editProduct,
    deleteImage,
    updateProduct,
    listProduct,
    unListProduct,
    deleteProduct
}