var express = require('express');
var app = express();
var server = require('http').Server(app);
var path = require('path');

var fs = require('fs')

var io = require('socket.io')(server);
var serverlogging = require('morgan');
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 




var identities = {};
server.listen(80);

app.use(serverlogging('dev'));
app.use(express.static(__dirname+ '/public'));
app.use(express.static(__dirname + '/public/savedTrees'));
//app.get('/', function(req,res){
//    res.sendfile('./public/index.html');
//    
//})

app.post('/savethis', function(req,res,next){
	var htmlString = req.body.content;
	var fileName = req.body.fileName;
	fs.writeFile(path.join(__dirname, '/public/savedTrees/' + fileName), htmlString, function(err){
		if(err){
			res.status(400).send(err);
		} else {
			res.status(200).send(fileName + ' written successfully');
		}
	})
})

app.get('/readFile', (req,res,next) => {
	console.log(req.query.pathname)
	let pathname = addSlashesIfNeedBe(req.query.pathname);
	
	fs.readFile(path.join(__dirname, pathname), 'utf8' ,function(err,data){
		if(err){
			res.status(400).send(err);
		} else {
			res.json(data);
		}
	})
})

app.post('/fs', function(req,res,next){

	var pathname = '/';
	if(req.body.pathname !== 'undefined'){
			pathname = addSlashesIfNeedBe(req.body.pathname);
	} 
	
	fs.readdir(path.join(__dirname,pathname), function(err, files){
		if(err){
			res.status(204).send(err);
		} else {
			var result = {};
			for(each in files){
				var oneFile = files[each];
				if(oneFile[0] != '.'){             //if it's not hidden
					if(oneFile.indexOf('.') === -1){ //and if there's no extension
						result[files[each]] = 'directory';
					} else {
						switch(oneFile.split('.')[1]){
							case 'js': result[files[each]] = 'text'; break;
							case 'css': result[files[each]] = 'text'; break;
							case 'html': result[files[each]] = 'text'; break;
							case 'svg': result[files[each]] = 'image'; break;
							case 'png': result[files[each]] = 'image'; break;
							case 'jpg': result[files[each]] = 'image'; break;
							case 'gif': result[files[each]] = 'image'; break;
						}
					}
				}
			}

			res.status(200).json({pathname, result});
		// fileArr = fileArr.slice(1, fileArr.length - 1); //git rid of brackets
		// fileArr = fileArr.split(','); //convert to array
		// fileArr = fileArr.map(function(aFileName){return aFileName.slice(1,aFileName.length -1)});
		}
	})
	
})


io.on('connection', function(socket){
		identities[socket.id] = {ip: socket.client.conn.remoteAddress.split(':').slice(-1)[0], name: null};
    socket.on('event', function (data){
      socket.broadcast.emit('event',data);
    });
		socket.on('filesaveResult', function (data){
      socket.broadcast.emit('filesaveResult',data);
    });
		socket.on('remoteRunFile', function(data){
			socket.broadcast.emit('remoteRunFile', data)
		})
		socket.on('cursorActivity', function(data){
			socket.broadcast.emit('cursorActivity', data)
		})
		socket.on('mirrorChange', function(data){
			socket.broadcast.emit('mirrorChange', data)
		})
		

		socket.on('identityRequest', function(req){
			//I think each client's identity request will come in separately, when one user asks whoami and hits enter, the local browser will evaluate that and emit an identity request, so this message shouldn't be broadcast.
			//req is the incoming message. socket is the particular connection.	
			// console.log(identities[socket.id]);
			socket.emit('identityResponse', {
				placeHolderId: req.placeHolderId,
				socketid: socket.id,
				ipaddress: identities[socket.id].ip,
				name: identities[socket.id].name
			});
		})


		socket.on('timeRequest', function(req){
			socket.emit('timeResponse', {
				placeHolderId: req.placeHolderId,
				serverTime: Date()
			})
		})

    //events to implement: identityRequest, timeRequest
})


function addSlashesIfNeedBe(aFilePath){
		if(aFilePath[0] !== '/'){
			aFilePath = '/' + aFilePath;
		}
		if(aFilePath[aFilePath.length - 1] !== '/'){
			aFilePath += '/'
		}
		return aFilePath;
	}
// socket.client.conn.remoteAddress reports the Public IP of the origin of the message
// socket.id reports the socket ID of the origin of the message. 
