// Express app
var _ = require('lodash');
var path = require('path');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var geoip = require('geoip-lite');
var favicon = require('serve-favicon');

// Static assets to be served:
app.use(favicon(path.join(__dirname,'static','favicon.ico')));
app.use(express.static(path.join(__dirname, 'static')));

// Set up middleware:
app.use(bodyParser.urlencoded({ extended: false }));	// parse application/x-www-form-urlencoded
app.use(bodyParser.json()); 	// for parsing application/json
app.use(cors())					// might need configuring, specific domains etc.

// Set up storage:
var storage = require('node-persist');
storage.initSync();

// Load scores data from disk if nothing persisted:
if (typeof storage.getItemSync('scores') === 'undefined') {
	fs = require('fs');
	fs.readFile('data/scores.json', 'utf-8', function(err,data) {
		storage.setItemSync('scores', data);
	});
	console.log("Loaded JSON scores.");
}
else {
	console.log("Persisted:", storage.getItemSync('scores'));
}

// Retrieve array of x highest scoring game objects:
function getHighscores(number = 3) {
	let scores = JSON.parse(storage.getItemSync('scores'));
	return _.chain(scores)
			.filter(score => score.tiles === 19)
			.map(score => _.pick(score, ['timestamp', 'country', 'name', 'score']))
			.sortBy('score')
			.reverse()
			.take(number)
			.value();
}

// Convert ip to country code:
function getCountry(ip) {
	var geo = geoip.lookup(ip);
	return geo && geo.country;			// async?
}

// Parse the incoming data object and prepare fields for database:
function prepRequestObject(req) {
	// Validate fields?
	return {
		gameid: req.body.gameID,
		timestamp: req.body.timestamp,
		ip: req.body.ip,
		country: /^\d+\.\d+\.\d+\.\d+}$/.test(req.body.ip) && getCountry(req.body.ip) || 'unknown',
		name: req.body.name,
		tiles: parseInt(req.body.tiles),	// should be 1 or 19
		score: parseInt(req.body.score)
	};
}

// Overwrite scores object both in-memory and to file on disk:
function writeScores() {

}
/* ROUTES
 *============================================================================*/
// Client GETs all scores:
app.get('/api/scores/:num', function(req, res) {
	let highscores = getHighscores(req.params.num);
	if (highscores) {
		res.status(200).json(highscores);		// is-cacheable header?
	}
});


// Client PUTs a new record:
app.put('/api/scores', function(req, res) {
	console.log("PUTting");
	var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	console.log(ip, req.ip);	// ::1, ::1

	let newscore = prepRequestObject(req);
	console.log(newscore);

	// Fetch db scores:
	let scores = JSON.parse(storage.getItemSync('scores'));
	console.log(scores.length + " scores retrieved.");
	// Append new record:
	scores.push(newscore);
	// Save into db:
	console.log(scores.length + " scores being saved.");	// should be 1 more
	storage.setItemSync('scores', JSON.stringify(scores));	// SHOULD ALSO WRITE TO FILE HERE?

	console.log(scores);
	// Return status code / message:
	res.status(200).send('Thanks');
});


// Client POSTs update to a score:
app.post('/api/scores', function(req, res) {
	console.log("POSTing");

	let updatedscore = prepRequestObject(req);
	console.log(updatedscore);

	// Check game was finished:
	if (updatedscore.tiles >= 3) {	// === 19
		// Fetch all db scores:
		let scores = JSON.parse(storage.getItemSync('scores'));
		console.log(scores.length + " scores retrieved.");
		// Find record by gameid and update it:
		scores = scores.map(function(entry) {
			return (entry.gameid == updatedscore.gameid) ? updatedscore : entry;
		});	// Done!
		// Save into db:
		console.log(scores.length + " scores being saved.");	// should be equal
		storage.setItemSync('scores', JSON.stringify(scores));	// SHOULD ALSO WRITE TO FILE HERE?
		console.log(scores);
		// Return status code / message:
		res.status(200).send('Thanks');
	}
});


// Reset API data store:
app.get('/api/reset', function(req, res) {
	storage.setItemSync('scores', null);
	console.log("Reset db");
});


// Serve static game page:
app.get('/', function(req, res) {
	console.log("Express serving index.html");
	//res.render('/index.html');
	res.sendFile(path.join(__dirname + '/static/index.html'));
});


// Serve:
const port = 3000;
app.listen(port);
console.log('Magic happens on port ' + port);
