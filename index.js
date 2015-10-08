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

var dialog = require('dialog');
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
var chk = "false";
var emitText = "";
var id;
var pw;
mongoose.connect("mongodb://grooshbene.milkgun.kr:27017/sns", function(err) {
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
  },
  tutor:{
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
  } else if (req.session.chk != null && req.session.tutor=="true") {
    res.sendFile(__dirname + "/intro.html");
    user.update({
      'user_id' : req.session.user_id
    },{
      'tutor' : "false"
    },function(err){
      if(err){
        console.log(err);
        throw err;
      }
    });
    user.findOne({
      'user_id' : req.session.user_id
    }, function(err,sign){
      if(err){
        console.log(err);
        throw err;
      }
      req.session.tutor = sign.tutor;
    })
  }
  else if(req.session.chk != null && req.session.tutor == "false"){
    res.sendFile(__dirname + "/index.html");
    article.find({},{_id:0,'user_article':1,'article_time':1,'user_name':1}).exec(function(err,a){
      if(err){
        console.log(err);
        throw err;
      }
      console.log(a);
      var TimeLine = a;
      var length = TimeLine.length;
      var tempLength = 0;
      io.on('connection', function(socket) {
        for(var i=length-1; i>=tempLength; i--){
        var emit = TimeLine[i].user_article;
        var emit_name = TimeLine[i].user_name;
        var emit_time = TimeLine[i].article_time
        socket.emit('timeline', {
            timeline : emit,
            name : emit_name,
            article_time : emit_time
        });
      }
      tempLength = length;
      });
    })
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
    'user_id': req.param('id'),
    'user_pw': req.param('pw')
  }, function(err, sign) {
    if (err) {
      console.err(err);
      throw err;
    }
    if (sign == null) {
      res.send("정보를 다시 확인해 주세요.");
    } else {
      console.log(sign);
      req.session.user_id = sign.user_id;
      req.session.user_pw = sign.user_pw;
      req.session.user_name = sign.user_name;
      req.session.chk = 1;
      req.session.tutor = sign.tutor;
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
  var text = req.param('text');
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
    res.redirect('/');
  }
});


app.post('/signin', function(req, res) {
  var sign = new user();
  sign.user_id = req.param('id');
  sign.user_pw = req.param('pw');
  sign.user_name = req.param('name');
  sign.tutor = "true";
  user.findOne({
    'user_id': req.param('id')
  }, function(err, sign) {
    if (err) {
      console.err(err);
      throw err;
    }
    if (sign == null) {
      chk = "true"
    }
  });
  if (sign.user_pw < 8) {
    res.send("비밀번호는 8자리 이상이어야 합니다!");
  } else if (chk == "true") {
    res.send("중복되는 아이디 입니다!");
  } else {
    sign.save(function(err, silence) {
      if (err) {
        console.log(err);
        throw err;
      }
    });
    console.log(sign);
    res.redirect('/');
  }
});
