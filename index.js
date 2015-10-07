var express = require('express');
var mongoose = require('mongoose');
var serveStatic = require('serve-static');
var app = express();
var server = require('http').Server(app);
server.listen(80);
console.log("Server Running At Port 80");
var io = require('socket.io')(server);
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: true
}));

var cookieParser = require('cookie-parser');
var cookie = require('cookie');
app.use(cookieParser());

var session = require('express-session');
var sessionStore = require('sessionstore');
store = sessionStore.createSessionStore();

app.use(session({
  store: store,
  secret: 'grooshbene',
  cookie: {
    path: '/',
    expires: false
  }
}));


app.use(serveStatic(__dirname, ({
  'index': false
})));

var data_base = mongoose.connection;
var chk = false;
var id;
var pw;
mongoose.connect("mongodb://localhost:27017/sns", function(err) {
  if (err) {
    console.log("Mongoose DB Error!");
    throw (err);
  }
});
var schema = mongoose.Schema;
var loginSchema = new schema({
  user_id: {
    type: String
  },
  user_pw: {
    type: String
  },
  user_name: {
    type: String
  }
});

var articleSchema = new schema({
  user_name : {
    type : String
  },
  user_article : {
    type : String
  },
  article_time : {
    type : Date
  }
});
var user = mongoose.model('user', loginSchema);
var article = mongoose.model('article', articleSchema);

app.get('/', function(req, res) {
  console.log(req.session);
  if (req.session.chk == null) {
    res.sendFile(__dirname + "/login.html");
  } else if (req.session.chk != null) {
    res.sendFile(__dirname + "/index.html");
  }
  io.on('connection', function(socket) {
    socket.emit('session', {
      user_id: req.session.user_id + " Welcome!"
    });
  });
});

app.get('/signin', function(req, res) {
  res.sendFile(__dirname + "/signin.html");
});

app.post('/login', function(req, res) {
  user.findOne({
    'user_id': req.body.id,
    'user_pw': req.body.pw
  }, function(err, sign) {
    if (err) {
      console.err(err);
      throw err;
    }
    if (sign == null) {
      res.send("정보가 잘못되었습니다!!");
    } else {
      console.log(sign);
      req.session.user_id = sign.user_id;
      req.session.user_pw = sign.user_pw;
      req.session.user_name = sign.user_name;
      req.session.chk = 1;
      console.log(req.session);
      res.redirect('/');
    }
  });
});

app.post('/logoutchk', function(req, res) {
  req.session.destroy(function(err) {
    if (err) {
      console.log(err);
      throw err;
    }
    res.redirect('/');
  });
  io.on('connection', function(socket) {
    socket.emit('session', {
      user_id: "Welcome!"
    });
  });
});

app.post('/articlemake', function(req,res){
  var a = new article();
  var text = req.body.text;
  var cnt_text = 0;
  while(cnt_text != text.length){
    text = text.replace("\n", "<br/>");
    cnt_text++;
  }
  a.user_article = text;
  a.user_name = req.session.user_name;
  a.article_time = new Date;
  if(a.user_article != null){
    a.save(function(err, silence){
      if(err){
        console.log(err);
        throw err;
      }
    });
    console.log(a);
    res.send("OK!");
  }
});

app.post('/showarticle', function(req,res){
  article.find({
    'user_name' : req.session.user_name
  }, function(err, article){
    if(err){
      console.err(err);
      throw err;
    }
    if(req.session.user_name == null){
      res.send("잘못된 접근입니다!");
    }
    if(article == null){
      res.send("작성글이 없습니다!");
    }
    else{
      console.log(article);
      res.send(article.join('<br><br>'));
    }
  })
})

app.post('/signin', function(req, res) {
  var sign = new user();
  sign.user_id = req.body.id;
  sign.user_pw = req.body.pw;
  sign.user_name = req.body.name;
  user.findOne({
    'user_id': req.body.id
  }, function(err, sign) {
    if (err) {
      console.err(err);
      throw err;
    }
    if (sign == null) {
      chk = true
    }
  });
  if (sign.user_pw < 8) {
    res.send("비밀번호는 8자리 이상이어야 합니다!");
  } else if (chk) {
    res.send("중복되는 아이디 입니다!");
  } else {
    sign.save(function(err, silence) {
      if (err) {
        console.log(err);
        throw err;
      }
    });
    console.log(sign);
    res.send(sign.user_id + " 계정으로 가입 되었습니다.");
  }
});
