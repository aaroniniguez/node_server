// app.js

const express = require('express'); 
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const os = require('os');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;
console.log = function(d){
	   log_file.write(util.format(d) + '\n');
	   log_stdout.write(util.format(d) + '\n');
};
var bodyParser = require('body-parser');
//for our purposes we use synchronous (blocking) because we are just reasing and writing to cron
var exec = require('child_process').execSync;
function execute(command){
	console.log("Running Command: "+ command);
	exec(command);
}
function execute2(command){
	exec(command, function(error, stdout, stderr){
		 console.log("Running Command: "+ command);
		 if(stderr)
		 	console.log(stderr);
		if(stdout)
			console.log(stdout);
	});
}
//Sleeps for the specified time period without affecting other threads.
const snooze = s => new Promise(resolve => setTimeout(resolve, s*1000));

//catches all errors, use this wrapper on all app.get callback func
const asyncHandler = fn =>  
    (req, res, next) =>  
    {   
        Promise.resolve(fn(req, res, next)).catch(function(error){   
			console.log(error);
			if(error.name == "InvalidInput" || error.name == "InvalidCredentials"){
				res.send(`{
				"type":"error",
				"message":"${error.message}"
				}`);
				res.end();
				return;
			}else{
				//console.log(error);
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
app.use(bodyParser.urlencoded({
	 extended: true 
}));
app.use(bodyParser.json());


//Static Resource Serving
app.use('/test-server/media/image', express.static(path.join(__dirname, '/test-server/media/image')));
app.use('/test-server/event', express.static(path.join(__dirname, '/test-server/event')));

//Root. Sends index.html
app.get('/', asyncHandler(async function(req, res) {
//	console.log(res);
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
		await snooze(10);
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
	if(typeof input === "undefined" || !input)
		throw {name: "InvalidInput", message: message};
}
app.post('/tweet.php', asyncHandler(async function(req, res) {
	res.type('json');
	//TODO always console log post data
	console.log(req.body);
	var password = req.body.password;
	var username = req.body.username;
	var tweet = req.body.tweet;
	var days = req.body.days;
	var hours = req.body.hours;
	validateString(password, "Please set Password");
	validateString(username, "Please set Username");
	validateString(tweet, "Please set a Tweet!");
	validateString(days, "Please set a Days Value!");
	validateString(hours, "Please set an hours Value!");
	tweet = tweet.replace(/'/g,"\\'");
	tweet = tweet.replace(/%/g, "\\%");
	tweet = tweet.replace(/\n/g, "\\n");
	//verify the users data
	const twitter = require("twitter");
	await twitter.verifyLoginInfo(username, password).catch(function(error){
	if(error.name == "TimeoutError"){
		console.log(error);
		throw {name: "InvalidCredentials", message: "Invalid Credentials!"};
	}
	else
		throw new Error(error);	
	});
	//put tweet into cron
	execute("sudo crontab -l > mycron");
	var newCron = `* */${hours} */${days} * * /root/.nvm/versions/node/v10.15.3/bin/node /home/ec2-user/node_server/twit.js "${username}" "${password}" \$'${tweet}'\n`
	console.log(newCron);
	fs.appendFileSync("mycron", newCron);
	execute("sudo crontab mycron");
	execute("rm mycron");
	//end cron stuff
	res.send(`{
	"type":"success",
	"message":"Message sent to cron!"
	}`);
	res.end();
	return;
}));

let server = app.listen(8080, function() {  
	console.log("Server is listening on port 8080");
});

