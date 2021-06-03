//INIT
require('dotenv').config();
const express        = require('express');
const app            = express();
const path           = require('path');
const port           = 3000;
const bodyParser     = require('body-parser');
const mongoose       = require('mongoose');
const dbURL          = process.env.DB_KEY_PROD;
const methodOverride = require('method-override');
const Blog           = require("./models/blogpost");
const User           = require("./models/user");
const flash          = require("connect-flash");
const session        = require('express-session');
const bcrypt         = require('bcrypt');
const { error }      = require('console');
const multer         = require('multer');
const { runInNewContext } = require('vm');

//User Authentication. Just me, really.

app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true
}));

//IMAGE UPLOAD SETTINGS

const uploadImage = require('./helpers/helpers')
const multerMid = multer({
  storage: multer.memoryStorage(),
  limits: {
    // no larger than 5mb.
    fileSize: 5 * 1024 * 1024,
  },
})

app.disable('x-powered-by')
app.use(multerMid.single('file'))
app.use(express.json())

app.use((err, req, res, next) => {
  res.status(500).json({
    error: err,
    message: 'Internal server error!',
  })
  next()
})
//middleware
const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

const isLoggedIn = (req, res, next) => {
    if (!req.session.user_id) { //if no user is present in req.session
        user = req.body; // create user object
        user.isLoggedIn = false; 
        next();
    } else {
        user = req.session;
    next();
    }
}

const isAdmin = (req, res, next) => {
    if (!req.session.admin) { //checks for admin status in session object
        req.session.admin=false; //sets to false if it doesn't explicitly exist 
        next();
    } else {
        next();
    }
}


//Mongoose settings, also clears deprication warning 
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect(dbURL, { useNewUrlParser: true });

//set view engine to ejs, removes need to specify '.ejs' file type for renders
app.set('view engine', 'ejs');

//packages that help with DB transactions
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

//links stylesheet directory
app.use(express.static(__dirname + '/public'));

//ROUTES AND HANDLERS
//LANDING PAGE AND HOME PAGE

app.get('/', isLoggedIn, isAdmin, (req, res) => { //checks for user, and if user is an admin for contextual navbar
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search), 'gi'); //scrubs search queary for security
        Blog.find({tags: regex}).exec((err, document) => { //mongoose call
            if(err){
                console.log(err);
            } else if(document.length<1) { //if search results less than 1
                res.render('index', {user: user, noResults: true}); //render index page and injects noResults variable 
            }
            else {
                res.render('index', {blogs: document, user: user, noResults:false}); //render index page with results 
            }
        });
    } else {
    Blog.find().sort({ createdAt: -1 }).exec((err, document) => { //if no query string was used, render index page with all blog posts, sorted by newest first
        if (err){
             console.log(err);
        } else {
        res.render('index', { blogs: document, user: user, noResults:false});
        }
    });
}
});

//LOGIN AND USER AUTH
app.get('/login', (req, res) => { 
    res.render('login');
});

app.post('/login', async(req, res) => {
    const { username, password } = req.body;
    const foundUser = await User.validateUser(username, password); //checks database for entered credentials
    if (foundUser) { //if credentials are matched to a DB entry
        req.session.user_id = foundUser._id; //creates req.session object
        req.session.username = foundUser.username;
        req.session.admin = foundUser.admin; //false by default when new users are registered. Can be changed in MongoAtlas
        res.redirect('/');
    } else {
        res.send("Invalid Credentials");
    }
});

app.post('/register', async(req, res) => {
    const { username, password, admin } = req.body; //pulled from form data
    const user = new User({ username, password, admin: false }); //creates new User
    await user.save(); //saves to Database
    req.session.user_id = user._id //creates session for new user
    req.session.username = user.username
    req.session.admin = false; //just making sure
    res.redirect('/');
})

app.get('/register', (req, res) => {
    res.render('register');
})

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});
//CRUD OPERATIONS FOR POSTS
//CREATE 
app.get('/blogs/create', isLoggedIn, isAdmin, (req, res) => {
    if(!req.session.admin) { //if req.session.admin is false
        res.send("you are not an admin")
    } else {
    res.render('create');
    }
});

app.post('/blogs/create/', isLoggedIn, isAdmin, async (req, res, next) => {
    if(!req.session.admin){
        res.send("you need to be an admin to do that");
    }  else {
        const myFile = req.file //file selected from form data on create page
        const imageUrl = req.file ?  await uploadImage(myFile) : ""; //if file has been selected, run uploadImage, otherwise set value to "" (blank)
        const images = imageUrl ? imageUrl : ""; //uploadImage creates a value for imageUrl when it runs, this checks for a value and if it doesn't have one, sets it to empty value so it doesn't cause errors when trying to save to DB
        const title = req.body.title;  //
        const author = req.body.author // keys/values for DB entry
        const text = req.body.text;    //
        const tags = req.body.tags ? req.body.tags.split(',', ', ') : ""; 
        const createdAt = Date.now();
        const newBlogPost = new Blog({ title: title, author: author, text: text, createdAt: createdAt, tags: tags, images: images });
        newBlogPost.save((err, result) => {
            if (err) console.log(err)
            console.log(result);
        });
        res.redirect('/');
    }
});

//READ BLOG POST 
app.get('/blogs/show/:id', (req, res) => {
    Blog.findById(req.params.id, (err, foundBlog) => {
        if (err) res.redirect('/');
        res.render('show', { blog: foundBlog });
    })
});

//UPDATE
app.get('/blogs/edit/:id', isLoggedIn, isAdmin, (req, res) => {
    if(!req.session.admin) {    
        res.send("You are not an admin");
    } else {
    Blog.findById(req.params.id, (err, foundBlog) => {
        if (err) res.redirect('/');
        res.render('edit', { blog: foundBlog });
    })
}
});

app.put('/blogs/edit/:id', (req, res) => { //PUT method feature is added by method-override npm 
    const title = req.body.title;
    const author = req.body.author;
    const text = req.body.text;
    const tags = req.body.tags.split(', ');
    const postEdit = { title: title, author: author, text: text, tags:tags };
    Blog.findByIdAndUpdate(req.params.id, postEdit, (err, res) => {
        if (err) console.log(err);
        console.log(res);
    });
    Blog.findById(req.params.id, (err, foundBlog) => {
        if (err) console.log(err);
        res.render('show', { blog: foundBlog });
    });

});

//DESTROY
app.delete('/blogs/delete/:id', (req, res) => {
    Blog.findByIdAndDelete(req.params.id, (err, result) => {
        if (err) console.log(err);
        console.log(result);
    });
    res.redirect('/');
});


app.listen(process.env.PORT || 3000, () => {
    console.log(`App Started and listening at http://localhost:${port}`);
});

