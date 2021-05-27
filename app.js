//INIT
require('dotenv').config();
const express        = require('express');
const app            = express();
const path           = require('path');
const port           = 3000;
const bodyParser     = require('body-parser');
const mongoose       = require('mongoose');
const dbURL          = process.env.DB_KEY_DEV;
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

app.post('/uploads', async (req, res, next) => {
  try {
    const myFile = req.file
    const imageUrl = await uploadImage(myFile)
    res
      .status(200)
      .json({
        message: "Upload was successful",
        data: imageUrl
      })
  } catch (error) {
    next(error)
  }
})

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
    if (!req.session.user_id) {
        user = req.body;
        user.isLoggedIn = false;
        next();
    } else {
        user = req.session;
    next();
    }
}

const isAdmin = (req, res, next) => {
    if (!req.session.admin) {
        req.session.admin=false;
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

app.get('/', isLoggedIn, isAdmin, (req, res) => {
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Blog.find({tags: regex}).exec((err, document) => {
            if(err){
                console.log(err);
            } else if(document.length<1) {
                res.render('index', {user: user, noResults: true});
            }
            else {
                res.render('index', {blogs: document, user: user, noResults:false});
            }
        });
    } else {
    Blog.find().sort({ createdAt: -1 }).exec((err, document) => {
        if (err){
             console.log(err);
        } else {
        res.render('index', { blogs: document, user: user, noResults:false});
        }
    });
}
});

app.get('/test', (req, res) => {
    req.body = req.session;
    console.log(user);
    res.send(req.body);
})

//LOGIN AND USER AUTH
app.get('/login', isLoggedIn, isAdmin, (req, res) => {
    res.render('login');
});

app.post('/login', async(req, res) => {
    const { username, password } = req.body;
    const foundUser = await User.validateUser(username, password);
    if (foundUser) {
        req.session.user_id = foundUser._id;
        req.session.username = foundUser.username;
        req.session.admin = foundUser.admin;
        res.redirect('/');
    } else {
        res.send("Invalid Credentials");
    }
});

app.post('/register', async(req, res) => {
    const { username, password, admin } = req.body;
    const user = new User({ username, password, admin: false });
    await user.save();
    req.session.user_id = user._id
    req.session.username = user.username
    req.session.admin = false;
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
    if(!req.session.admin) {
        res.send("you are not an admin")
    } else {
    res.render('create');
    }
});

app.post('/blogs/create/', isLoggedIn, isAdmin, (req, res) => {
    if(!req.session.admin){
        res.send("you need to be an admin to do that");
    } else {
    let index, len;
    const images = req.files ? [] : [];
    for (index = 0, len = req.files.length; len>index; index++ ){
        images.push(req.files[index].filename)
    }
    const title = req.body.title;
    const author = req.body.author;
    const text = req.body.text;
    const tags = req.body.tags.split(',', ', ');
    const createdAt = Date.now();
    const newBlogPost = new Blog({ title: title, author: author, text: text, createdAt: createdAt, tags: tags, images: images });
    newBlogPost.save((err, result) => {
        if (err) console.log(err)
        console.log(result);
    });
    res.redirect('/blogs/show/' + newBlogPost._id);
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

app.put('/blogs/edit/:id', (req, res) => {
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

//IMAGE UPLOAD

// app.get('/upload', isLoggedIn, isAdmin, (req, res) =>{
//         res.render('upload');
// });

// app.post('/public/pictures', upload.array('photo'), (req, res) => {
//     if(req.file){
//         res.json(req.file);
//     } else throw 'error'; 
// });

app.listen(process.env.PORT || 3000, () => {
    console.log(`App Started and listening at http://localhost:${port}`);
});

