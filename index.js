const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const cookieSession = require('cookie-session');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const dbConnection = require('./database');
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const { ExpressPeerServer } = require("peer");
const opinions = {
    debug: true,
}

app.set("view engine", "ejs");
const io = require("socket.io")(server, { 
    cors: {
        origin: '*'
    }
});
app.get("/room", (req,res,next) => {
     let id = req.params.id;
     dbConnection.query("SELECT * FROM `users` ",[id])
     .then(([rows]) => {
        res.render('room',{name:rows[0].name,roomId: req.params.room});
     });
  });

// app.get("room/:room", (req, res) => {
//     res.render("room", { roomId: req.params.room });
// });

io.on("connection", (socket) => {
    socket.on("join-room", (roomId, userId, userName) => {
        socket.join(roomId);
        setTimeout(() => {
            socket.to(roomId).broadcast.emit("user-connected", userId);
        }, 1000)
        socket.on("message", (message) => {
            io.to(roomId).emit("createMessage", message, userName);
        });
    });
});



app.use("/peerjs", ExpressPeerServer(server, opinions));
app.use(express.static("public"));


app.use(express.urlencoded({extended:false}));

app.set('views', path.join(__dirname,'views'));
app.set('view engine','ejs');

app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],
  maxAge:  3600 * 1000 
}));

const ifNotLoggedin = (req, res, next) => {
  if(!req.session.isLoggedIn){
      return res.render('login');
  }
  next();
}
const ifLoggedin = (req,res,next) => {
  if(req.session.isLoggedIn){
      return res.redirect('/index');
  }
  next();
}
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));

app.get('/', ifNotLoggedin, (req,res,next) => {
  dbConnection.execute("SELECT `name` FROM `users` WHERE `id`=?",[req.session.userID])
  .then(([rows]) => {
      res.render('index',{
          name:rows[0].name
      });
  });
  
});

app.post('/register', ifLoggedin, 
[
  body('user_email','Invalid email address!').isEmail().custom((value) => {
      return dbConnection.execute('SELECT `email` FROM `users` WHERE `email`=?', [value])
      .then(([rows]) => {
          if(rows.length > 0){
              return Promise.reject('This E-mail already in use!');
          }
          return true;
      });
  }),
  body('user_name','Username is Empty!').trim().not().isEmpty(),
  body('user_pass','The password must be of minimum length 6 characters').trim().isLength({ min: 6 }),
],
(req,res,next) => {

  const validation_result = validationResult(req);
  const {user_name, user_pass, user_email} = req.body;

  if(validation_result.isEmpty()){

      bcrypt.hash(user_pass, 12).then((hash_pass) => {

          dbConnection.execute("INSERT INTO `users`(`name`,`email`,`password`) VALUES(?,?,?)",[user_name,user_email, hash_pass])
          .then(result => {
              
              res.send(`<center>your account has been created successfully, Now you can <a href="/">Login</a></center>`);
          }).catch(err => {

              if (err) throw err;
          });
      })
      .catch(err => {

          if (err) throw err;
      })
  }
  else{

      let allErrors = validation_result.errors.map((error) => {
          return error.msg;
      });

      res.render('login',{
          register_error:allErrors,
          old_data:req.body
      });
  }
});



app.post('/', ifLoggedin, [
  body('user_email').custom((value) => {
      return dbConnection.execute('SELECT email FROM users WHERE email=?', [value])
      .then(([rows]) => {
          if(rows.length == 1){
              return true;
              
          }
          return Promise.reject('Invalid Email Address!');
          
      });
  }),
  body('user_pass','Password is empty!').trim().not().isEmpty(),
], (req, res) => {
  const validation_result = validationResult(req);
  const {user_pass, user_email} = req.body;
  if(validation_result.isEmpty()){
      
      dbConnection.execute("SELECT * FROM `users` WHERE `email`=?",[user_email])
      .then(([rows]) => {
          bcrypt.compare(user_pass, rows[0].password).then(compare_result => {
              if(compare_result === true){
                  req.session.isLoggedIn = true;
                  req.session.userID = rows[0].id;

                  res.redirect('/');
              }
              else{
                  res.render('login',{
                      login_errors:['Invalid Password!']
                  });
              }
          })
          .catch(err => {
              if (err) throw err;
          });


      }).catch(err => {
          if (err) throw err;
      });
  }
  else{
      let allErrors = validation_result.errors.map((error) => {
          return error.msg;
      });

      res.render('login',{
          login_errors:allErrors
      });
  }
});

server.listen(process.env.PORT || 3000, () => console.log("Server is Running..."));


app.get("/", (req, res) => {

  res.render("index");
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/back", (req, res) => {
  req.session = null;
  res.redirect('/');
});

app.get("/Users", (req,res,next) => {
  dbConnection.query("SELECT * FROM `users` ",[req.session.userID])
  .then(([rows]) => {
      res.render('Users',{data:rows});
  });
});

app.get("/adminAction/create", (req, res) => {
  res.render("adminAction/Create", { model: {} });
});



app.get("/create", (req, res) => {
  res.render("create", { model: {} });
});


app.post('/adminAction/Create',

[
    body('user_email','Invalid email address!').isEmail().custom((value) => {
        return dbConnection.execute('SELECT email FROM users WHERE email=?', [value])
        .then(([rows]) => {
            if(rows.length > 0){
                return Promise.reject('This E-mail already in use!');
            }
            return true;
        });
    }),
    body('user_name','Username is Empty!').trim().not().isEmpty(),
    body('user_pass','The password must be of minimum length 6 characters').trim().isLength({ min: 6 }),
],
(req,res,next) => {

    const validation_result = validationResult(req);
    const {user_name, user_pass,user_email,id} = req.body;

    if(validation_result.isEmpty()){

        bcrypt.hash(user_pass, 12).then((hash_pass) => {

            dbConnection.execute("INSERT INTO `users`(`name`,`email`,`password`) VALUES(?,?,?)",[user_name,user_email, hash_pass])
            .then(result => {
              res.redirect("/Users");
            }).catch(err => {

                if (err) throw err;
            });
        })
        .catch(err => {

            if (err) throw err;
        })
    }

});


app.get("/adminAction/edit/(:id)", (req,res,next) => {
  let id = req.params.id;
  dbConnection.query('SELECT * FROM users WHERE id = ?', [id], [res,req])
  .then(([rows]) => {
      res.render('adminAction/Edit',{data:rows[0]});
  });
});

app.post('/adminAction/edit/(:id)', 

[
    body('user_email','Invalid email address!').isEmail().custom((value) => {
        return dbConnection.execute('SELECT email FROM users WHERE email=?', [value])
        .then(([rows]) => {
            if(rows.length > 0){
                return Promise.reject('This E-mail already in use!');
            }
            return true;
        });
    }),
    body('user_name','Username is Empty!').trim().not().isEmpty(),
    body('user_pass','The password must be of minimum length 6 characters').trim().isLength({ min: 6 }),
],
(req,res,next) => {

    const validation_result = validationResult(req);
    const {user_name, user_pass,user_email,id} = req.body;

    if(validation_result.isEmpty()){

        bcrypt.hash(user_pass, 12).then((hash_pass) => {

            dbConnection.query("UPDATE users SET name = ?, email = ?, password = ? WHERE id = "+ id,[user_name,user_email, hash_pass])
            .then(result => {
              res.redirect("/Users");
            }).catch(err => {

                if (err) throw err;
            });
        })
        .catch(err => {

            if (err) throw err;
        })
    }

});
app.get('/delete/(:id)', (req, res) => {
  let id = req.params.id;
      dbConnection.query('DELETE FROM users WHERE id = ?', [id], [res,req])
      .then(([rows]) => {
          res.redirect('/Users');
      }); 
      });

app.get('/logout',(req,res)=>{
  req.session = null;
  res.redirect('/');
});
