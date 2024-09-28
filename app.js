const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');
const path = require('path');
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const multer = require('multer');

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());




const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/uploads')
    },
    filename: function (req, file, cb) {
        //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        crypto.randomBytes(12, function (err, bytes) {
            // console.log(bytes.toString("hex"));
            const fn = bytes.toString("hex") + path.extname(file.originalname);
            cb(null, fn)
        })
    }
})

const upload = multer({ storage: storage })


app.get('/', function (req, res) {
    // res.send("hey");
    res.render('index')
})

app.get('/test', function (req, res) {
    // res.send("hey");
    res.render('test')
})

app.post('/upload',upload.single("image") ,  function (req, res) {
    // res.send("hey");
    // res.render('test')
    console.log(req.file);
    res.render('test')
})

app.get('/logout', function (req, res) {
    // res.send("hey");
    res.cookie("token", "");
    res.redirect('/login')
})

function isLoggedIn(req, res, next) {
    if (req.cookies.token === "") res.redirect("login");
    else {
        let data = jwt.verify(req.cookies.token, "secret");
        req.user = data;
        next();
    }
}

app.get('/profile', isLoggedIn, async function (req, res) {
    // res.send("hey");
    // IsLoggedIn();
    // console.log(req.user);
    var user = await userModel.findOne({ _id: req.user.userid }).populate("posts");
    // console.log(user);
    res.render('profile', { user });
})

app.get('/login', function (req, res) {
    // res.send("hey");
    res.render('login')
})

app.get('/like/:id', isLoggedIn, async function (req, res) {

    var post = await postModel.findOne({ _id: req.params.id });
    if (post.likes.indexOf(req.user.userid) == -1) {
        post.likes.push(req.user.userid);
        await post.save();
    }
    else {
        post.likes.pop(req.user.userid);
        await post.save();
    }
    res.redirect('/profile')

})


app.post('/login', async (req, res) => {

    var { email, password } = req.body;
    var user = await userModel.findOne({ email });
    if (!user) return res.status(500).send("Something went wrong");
    // console.log(user);
    // console.log(password);
    // console.log(user.password);
    bcrypt.compare(password, user.password, function (err, result) {
        // console.log(result);    
        if (result) {
            let token = jwt.sign({ email: email, userid: user._id }, "secret")
            res.cookie("token", token);
            res.redirect('/profile');
        }
    })
})

app.post('/register', async function (req, res) {
    let { username, name, age, email, password } = req.body;

    let user = await userModel.findOne({ email });

    if (user) return res.status(500).send("User already exists");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            // console.log(hash);
            let user = await userModel.create({
                username,
                name,
                email,
                age,
                password: hash
            });
            let token = jwt.sign({ email: email, userid: user._id }, "secret")
            res.cookie("token", token);
            res.redirect('/profile')
        })
    })

})


app.post('/post', isLoggedIn, async (req, res) => {

    var { content } = req.body;
    // console.log(content);
    var post = await postModel.create({
        user: req.user.userid,
        content,
    })
    var user = await userModel.findOne({ _id: req.user.userid });
    // console.log(user);
    user.posts.push(post._id);
    await user.save();
    // console.log(post);
    res.redirect('/profile');

})



app.listen(3000);