const fs = require('fs');
const sharp = require('sharp');
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

const cropImage = async (inputPath, outputPath, width, height) => {
    try {
        await sharp(inputPath)
            .resize(width, height)
            .toFile(outputPath);
    } catch (error) {
        console.error('Error cropping image:', error);
    }
};


const addProduct = async(req,res) =>{
    try {

        const categoriesData = await Category.find({status: true});

        const img = [];

        for(i=0;i<req.files.length;i++){
            img[i] = req.files[i].filename;
        }

        // Find the ObjectId of the selected category
        const selectedCategory = await Category.findOne({ name: req.body.category });
        const categoryId = selectedCategory._id;

        // Check if the sum of product offer and category offer exceeds 100
        const totalOffer = parseFloat(req.body.offer) + parseFloat(selectedCategory.offer);
        if (totalOffer >= 100) {
            return res.render('add-product', { 
                categories: categoriesData, 
                message: 'Total offer cannot exceed 100%',
                formData: req.body // Retain form data 
            });
        }

        const product = new Product({
            name: req.body.name,
            brand: req.body.brand,
            price: req.body.price,
            category: categoryId,
            description: req.body.description,
            image: img,
            quantity: req.body.quantity,
            offer: req.body.offer
        });

        const productData = await product.save();

        // After saving the product, you can perform image cropping
        for (let i = 0; i < req.files.length; i++) {
            const imagePath = path.join(__dirname, '../public/admin/productImages', req.files[i].filename);
            const croppedImagePath = path.join(__dirname, '../public/images/cropped', req.files[i].filename);

            // Assuming you want to crop each image to 1100x1100 pixels
            await cropImage(imagePath, croppedImagePath, 1100, 1100);
        }

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
        fs.unlink( path.join( __dirname, '../public/images/cropped/') + image , ( err ) => {
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
            const id = req.body.productId;
            const productData = await Product.findById({_id: id}).populate('category');
            const categoriesData = await Category.find({status: true});
            
            // Find the ObjectId of the selected category
            const selectedCategory = await Category.findOne({ name: req.body.category });
            const categoryId = selectedCategory._id;

            // Check if the sum of product offer and category offer exceeds 100
            const totalOffer = parseFloat(req.body.offer) + parseFloat(selectedCategory.offer);
            if (totalOffer >= 100) {
                return res.render('edit-product', { 
                    product: productData,
                    categories: categoriesData,
                    message: 'Total offer cannot exceed 100%'
                });
            }

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
                        image : img,
                        offer: req.body.offer
                    }
                })

            // After updating the product, you can perform image cropping
            for (let i = 0; i < req.files.length; i++) {
                const imagePath = path.join(__dirname, '../public/admin/productImages', req.files[i].filename);
                const croppedImagePath = path.join(__dirname, '../public/images/cropped', req.files[i].filename);

                // Assuming you want to crop each image to 1100x1100 pixels
                await cropImage(imagePath, croppedImagePath, 1100, 1100);
            }
            
            res.redirect( '/admin/products' );
        
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