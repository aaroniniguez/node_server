// app.js

const express = require('express'); 
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const os = require('os');
var bodyParser = require('body-parser');

//Sleeps for the specified time period without affecting other threads.
const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

//catches all errors, use this wrapper on all app.get callback func
const asyncHandler = fn =>  
    (req, res, next) =>  
    {   
        Promise.resolve(fn(req, res, next)).catch(function(error){   
			console.log(error);
			if(error.name == "InvalidInput"){
				res.send(`{
				"type":"error",
				"message":"${error.message}"
				}`);
				res.end();
				return;
			}
            next();
        });
    };  

function printFile(filename, req, res) {
	//TODO: convert to using sendFile
	try {  
		var data = fs.readFileSync(filename, 'utf8');
		data = data.replace(/HTTP_HOST/g, req.headers.host);
		res.send(data);
	} catch(e) {
		console.log(e);
		res.status(404).send("Not Found");
	}
}


//Define app
let app = express();
app.use(function (req, res, next) {
  console.log(req.url);
  next();
});
app.use(bodyParser.urlencoded(
{
	 extended: true 
}));
app.use(bodyParser.json());


//Static Resource Serving
app.use('/test-server/media/image', express.static(path.join(__dirname, '/test-server/media/image')));
app.use('/test-server/event', express.static(path.join(__dirname, '/test-server/event')));

//Root. Sends index.html
app.get('/', asyncHandler(async function(req, res) {
	console.log(res);
	res.type('html');
	printFile("index.html", req, res);
	res.end();
}));

//Config Endpoint
app.get('/test-server/ad-server/config.php', asyncHandler(async function(req, res) {
	res.type('json');
		
	//Get app id
	let appid = req.query.appid;
	if (appid === undefined) {
		res.status(404).end("Not Found");
		return;			
	}

	//App ID 4 causes a 403
	if (req.query.appid == 4) {
		res.status(403).end("Forbidden");
		return;
	}
	let filename = "./test-server/ad-server/config/appid_" + appid + ".json";
	printFile(filename, req, res);
	res.end();
}));

//Request Endpoint
app.get('/test-server/ad-server/request.php', asyncHandler(async function(req, res) {
	res.type('json');
	//Get Zone id
	let zid = req.query.zid;
	if (zid === undefined) {
		res.status(404).end("Not Found");
		return;			
	}

	//Zone ID 1008 causes a 403
	if (zid == 1008) {
		res.status(403).end("Forbidden");
		return;
	}
	
	//Zone ID 39 will probably cause a client-side timeout
	if (zid == 39) {
		await snooze(10 * 1000);
	}

	let filename = "./test-server/ad-server/request/zid_" + zid + ".json";
	printFile(filename, req, res);
	res.end();
}));
//Request Endpoint
app.get('/test.php', asyncHandler(async function(req, res) {
	res.type('json');
	//Get Zone id
	res.send(
	`{"andrew":"chode"}`);
	res.end();
	return;
}));
function validateString(input, message)
{
	if(typeof input === "undefined" || !input){
		var myError = new Error(message);
		myError.name = "InvalidInput";
		throw myError;
	}
}
app.post('/tweet.php', asyncHandler(async function(req, res) {
	res.type('json');
	//TODO always console log post data
	console.log(req.body);
	var password = req.body.password;
	var username = req.body.username;
	var tweet = req.body.tweet;
	validateString(password, "Please set Password");
	validateString(username, "Please set Username");
	validateString(tweet, "Please set a Tweet!");
	//do data validation here;
	const twitter = require("twitter");
	await twitter.postOnTwitter(username, password, tweet, uploadFile = false, randomFollow = false).catch(function(error){
		console.log(error);
		console.log(error.name);
		if(error.name == "TimeoutError"){
			res.send(`{
			"type":"error",
			"message":"Invalid credentials!"
			}`);
			res.end();
			return;
		}
	});
	res.send(`{
	"type":"success",
	"message":"Tweet has been successfully scheduled!"
	}`);
	res.end();
	return;
}));

let server = app.listen(8080, function() {  
	console.log("Server is listening on port 8080");
});

