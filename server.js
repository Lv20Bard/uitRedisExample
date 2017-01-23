var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var bodyParser = require('body-parser');
var redis = require('redis');
var client = redis.createClient(); //creates a new redis client

// set up to accept json as parameters
app.use(bodyParser.json());

// @NOTE: do this if you want to change the default directory for views, which is /views
app.set('views', path.join(__dirname, '/templates'));

// set the view engine to ejs
app.set('view engine', 'ejs');

// set the static path (for css, js, etc.)
app.use('/css', express.static(path.join(__dirname, 'public/css')));

// routes via express
app.get('/', function(req, res) {

	res.render('index', {
		description: "Gentlemen, you can't fight in here! This is the War Room."
	});
});

// redis functionality
client.on('connect', function() {

    console.log('redis is connected!');
    
});

// socket.io functionality
io.on('connection', function(socket){

  console.log('a user connected via sockets');

  // the disconnect event; this triggers when the socket session is terminated (the user closes their browser window)
  socket.on('disconnect', function() {
    
    console.log('the user '+socket.username+' disconnected...');
    

    client.srem("userlist", socket.username, function(err, reply){
      client.smembers("userlist", function(err, reply){


        socket.emit('logged users', reply );
        socket.broadcast.emit('logged users', reply);
      });
    });


  });

  socket.on('send message', function(msg) {

    var newmessage = "<strong>"+socket.username+":</strong> "+msg;

    // @TODO3: add your message to the list here! Remember to emit!
    client.rpush("messages", newmessage, function(err, reply){
        client.lrange("messages", 0, -1, function(err, messages){
          socket.emit('show messages', messages);
          socket.broadcast.emit('show messages', messages);
        });
    });
  });

  // listening for when you enter your name
  socket.on('enter name', function(name) {

  	socket.username = name;


    client.set("last-logged", ""+name, function(err, reply){
      client.get('last-logged', function(err, reply){

        socket.emit('last logged', reply);
        socket.broadcast.emit('last logged', reply);
    
      });
    });


    client.sadd("userlist", name, function(err, reply){
        client.smembers("userlist", function(err, users){
          socket.emit('logged users', users);
          socket.broadcast.emit('logged users', users);
        }); 
    });

  });

  // logged user functionality; this is triggered when the user opens the browser

  client.lrange("messages", 0, -1, function(err, messages){
    socket.emit('show messages', messages);
    socket.broadcast.emit('show messages', messages);
  });


  client.get("last-logged", function(err, reply){
    socket.emit('last logged', reply);
    socket.broadcast.emit('last logged', reply);
  });

  client.smembers("userlist", function(err, users){
    
    socket.emit('logged users', users);
    socket.broadcast.emit('logged users', users);
  }); 


});

http.listen(8080);
console.log("Listening on port 8080...");