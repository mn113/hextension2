// Express app
var _ = require('lodash');
var express = require('express');
var app = express();
var cors = require('cors')
app.use(cors())			// might need configuring, specific domains etc.

var storage = require('node-persist');
storage.initSync();

// Test storage:
storage.setItemSync('name','Martin');
console.log(storage.getItemSync('name'));

// Load scores data from disk:
fs = require('fs');
fs.readFile('data/scores.json', 'utf-8', function(err,data) {
	storage.setItemSync('scores', data);
	console.log(storage.getItemSync('scores'));
});

function getHighscores(number = 3) {
	let scores = JSON.parse(storage.getItemSync('scores'));
	return _.chain(scores)
			.sortBy('score')
			.reverse()
			.take(number)
			.value();
}

// Client GETs all scores:
app.get('/api/scores/:num', function(req, res){
  res.send(getHighscores(req.params.num));
});

// Client POSTs a new score:
app.post('/api/scores', function(req, res){
	console.log(req);
	res.send('Thanks');
});

// Serve:
app.listen(3000);
