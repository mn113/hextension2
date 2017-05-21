// Express app
var _ = require('lodash');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var geoip = require('geoip-lite');

// Set up middleware:
app.use(bodyParser.urlencoded({ extended: false }));	// parse application/x-www-form-urlencoded
app.use(bodyParser.json()); 	// for parsing application/json
app.use(cors())					// might need configuring, specific domains etc.

// Set up storage:
var storage = require('node-persist');
storage.initSync();

// Load scores data from disk:
fs = require('fs');
fs.readFile('data/scores.json', 'utf-8', function(err,data) {
	storage.setItemSync('scores', data);
	//console.log(storage.getItemSync('scores'));
});

// Retrieve array of x highest scoring game objects:
function getHighscores(number = 3) {
	let scores = JSON.parse(storage.getItemSync('scores'));
	return _.chain(scores)
			.sortBy('score')
			.reverse()
			.take(number)
			.value();
}

// Convert ip to country code:
function getCountry(ip) {
	var geo = geoip.lookup(ip);
	return geo.country;			// async?
}

// Parse the incoming data object and prepare fields for database:
function prepRequestObject(req) {
	// Validate fields?
	return {
		gameid: req.body.gameID,
		timestamp: req.body.timestamp,
		ip: req.body.ip,
		country: getCountry(req.body.ip),
		name: req.body.name,
		tiles: parseInt(req.body.tiles),	// should be 1 or 19
		score: parseInt(req.body.score)
	};
}

// Overwrite scores object both in-memory and to file on disk:
function writeScores() {

}

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
	console.log(req.ip);	// ::1
	//console.log(req.body);

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
	//console.log(req.body);

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

// Serve:
const port = 3000;
app.listen(port);
console.log('Magic happens on port ' + port);
