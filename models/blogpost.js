const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: String,
    author: String,
    text: String,
    blogImage01: String,
    createdAt: Number,
    tags: [String],
    images: [String]

});
const Blog = mongoose.model("Blog", blogSchema);
module.exports = Blog;