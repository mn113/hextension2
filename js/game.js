/***************/
/*! GAME SETUP */
/***************/
/* Board layout:
           ____
      ____/ 31 \____
 ____/ 21 \____/ 41 \____
/ 11 \____/ 32 \____/ 51 \
\____/ 22 \____/ 42 \____/
/ 12 \____/ 33 \____/ 52 \
\____/ 23 \____/ 43 \____/
/ 13 \____/ 34 \____/ 53 \
\____/ 24 \____/ 44 \____/
     \____/ 35 \____/
          \____/
*/

var gamearea = $('gamearea');

var filledPlaces = [];	// add to it each turn
var bay = [];			// must only contain 1 tile

var p = {
	11: {val: [0,0,0], nb: [21,22,12]},
	12: {val: [0,0,0], nb: [11,22,23,13]},
	13: {val: [0,0,0], nb: [12,23,24]},
	21: {val: [0,0,0], nb: [11,22,32,31]},
	22: {val: [0,0,0], nb: [21,32,33,23,12,11]},
	23: {val: [0,0,0], nb: [22,33,34,24,13,12]},
	24: {val: [0,0,0], nb: [13,23,34,35]},
	31: {val: [0,0,0], nb: [21,32,41]},
	32: {val: [0,0,0], nb: [31,41,42,33,22,21]},
	33: {val: [0,0,0], nb: [32,42,43,34,23,22]},
	34: {val: [0,0,0], nb: [33,43,44,35,24,23]},
	35: {val: [0,0,0], nb: [24,34,44]},
	41: {val: [0,0,0], nb: [31,32,42,51]},
	42: {val: [0,0,0], nb: [41,32,33,43,52,51]},
	43: {val: [0,0,0], nb: [42,33,34,44,53,52]},
	44: {val: [0,0,0], nb: [35,34,43,53]},
	51: {val: [0,0,0], nb: [41,42,52]},
	52: {val: [0,0,0], nb: [51,42,43,53]},
	53: {val: [0,0,0], nb: [44,43,52]}
};

var tileSetup = {
	x: [1,5,9],		// water, sewage, oil
	y: [3,4,8],		// canal, pylons, cable
	z: [2,6,7]		// path, road, rail
};

var allTiles = {};	// necessary?

var tileCount = 0;

var lastTile;

var gameMode = '';	// '' || 'move' || 'recycle' || 'finished'

var costs = {
	undo: 75,
	recycle: 225,
	move: 375
}

var user = {
	ip: myip,	// should be ready from previous script... maybe
	country: ''
};


/******************/
/*! GENERATE GAME */
/******************/
function generateTiles() {
	// Generate the 27 possible tiles:
	for (var a=0, xl=tileSetup.x.length; a < xl; a++) {
		for (var b=0, yl=tileSetup.y.length; b < yl; b++) {
			for (var c=0, zl=tileSetup.z.length; c < zl; c++) {

				// Make id combined of x, y & z values:
				var id = ''+ tileSetup.x[a] + tileSetup.y[b] + tileSetup.z[c];
				// Instantiate a new tile:
                var tile = new Tile(id);
				// Store for later access:
                allTiles[id] = tile;
				//  Insert into document:
				tile.el.inject($('bank'));
            }
    	}
    }
}

function generateBoard() {
    // Places:
    var boardCoords = Object.keys(p);
	for (var a=0; a < boardCoords.length; a++) {
		// Create html element:
		var place = new Element('div', {
		    'id': 'p'+boardCoords[a],
		    'class': 'place valid',
		});
		//  Insert into document:
		place.inject($('board'));
	}

    // Edge tiles:
	var edgeCoords =  ['00','01','02','03',10,14,20,25,30,36,40,45,50,54,60,61,62,63];  // ADD 1 to eliminate strings?
    for (var b=0; b < edgeCoords.length; b++) {
		// Create html element:
		var edge = new Element('div', {
		    'id': 'f'+edgeCoords[b],
		    'class': 'tile edge',
		});
		//  Insert into document:
		edge.inject($('edges'));
	}
}


/*******************/
/*! TILE FUNCTIONS */
/*******************/
function Tile(id) {
	var t = {};		// returnable

	t.id = id;

	t.values = [parseInt(id[0]), parseInt(id[1]), parseInt(id[2])];	// x,y,z

	// Create the tile's html element:
	t.el = new Element('div', {
		'id': 't'+id,
		'class': 'tile',
		'styles': {
			'background': 'url(img/tiles/'+id+'.png)'
		}
	});

	t.getElement = function() {
		return $('t'+id);
	};

	t.toBay = function() {
		t.el.inject($('bay'));
		bay.push(t);
	};

	t.toBank = function() {
		t.el.inject($('bank'));
	};

	t.upNext = function() {
		t.toBay();
		t.el.addClass('current')
			.setStyles({
				'top':'10px',
				'left':'4px',
				'display': 'none'
			});
		new Fx.Reveal(t.getElement(), {duration: 750, transitionOpacity: true}).reveal();
	};

	t.makeDraggable = function(isFresh) {
		// Set up draggability:
		t.tileDrag = new Drag.Move(t.el, {
			droppables: $$('.valid'),
			container: gamearea,
			precalculate: true,		// improves performance
			snap: 10,
			onStart: function(element) {
				t.el.addClass("current");
				// If parent is a filled place, make it unfilled:
				var parent = t.el.getParent();
				if (parent.hasClass('filled')) {
					unsetPlace(parent);
				}
				// First tile can be moved anywhere:
				if (gameMode == 'move' && tileCount < 2) {
					$$('#board .place').addClass('valid');
				}
			},
			onDrop: function(element, droppable) {
				// Can we really drop here?
				if (!droppable || !droppable.hasClass('valid')) {
					console.log(droppable);
					t.springBack();
				}
				// If dropped on board place:
				else {
					// Remove draggability:
					t.tileDrag.detach();

					// Drop it:
					t.el.inject(droppable);
					t.el.removeClass('current');
					filledPlaces.erase(parseInt(droppable.id));
					console.log('t'+t.el.id+' dropped into '+droppable.id);

					// Remove tile from bay if it came from there:
					if (isFresh) {
						bay.splice(t.el);
					}

					// Complete special move if moved here from another board place:
					if (!isFresh && droppable.id !== 'p'+t.location) {
						console.log(droppable.id, t.location);
						hiddenScore -= costs.move;
						updateState();
						showMessage("You have been charged $"+costs.move);
					}

					// Store the tile's values:
					t.addToBoard(parseInt(droppable.get('id').slice(1))); 	// e.g. 53;

					// Zero tile position if on board place:
					t.el.setStyles({
						'top': '-36px',	// WORKS FOR BOARD, NOT BAY
						'left': 0
					});
				}
			}
		});
	};

	t.springBack = function() {
		var animation = new Fx.Morph(t.el, {duration: 300});
		animation.start({'top': 0, 'left': 0});
		console.log('Sproing!');
	};

	t.addToBoard = function(location) {
		// Store values in global board object:
		p[location].val = t.values;
		filledPlaces.push(location);
		$('p'+location).removeClass('valid').addClass('filled');
		// Store location on tile:
		t.location = location;
		lastTile = t;
		updateState();
	};

	t.recycle = function() {
		// Unset place:
		var parent = t.el.getParent();
		unsetPlace(parent);
		// Take tile off the board:
		t.toBank();
		t.location = null;
		// Admin:
		hiddenScore -= costs.recycle;
		updateState();
		showMessage("Tile recycled.");
		showMessage("You have been charged $"+costs.recycle);
	};

	t.move = function() {
		showMessage("Drag the tile to an empty space.");
		t.makeDraggable(false);
		// The rest happens only on drop...
	};

	return t;		// Export the module
}


/*******************/
/*! GAME FUNCTIONS */
/*******************/
function chooseTile(id) {
	var domTile;
	if (id) {
		domTile = $('t'+id);
	}
	else {
		// Select a random tile from the invisible bank:
		domTile = $$('#bank .tile').getRandom();
	}
	// Select Tile object with that id (chop the 't'):
	var myTile = allTiles[domTile.get("id").slice(1)];
	console.log(myTile);
	// Transfer chosen tile to the bay & make fully draggable:
	myTile.toBay();
    myTile.upNext();
    myTile.makeDraggable(true);
}

function updateState() {
	// Board:
	tileCount = $$('#board .place .tile').length;
	findValidPlaces();	// must precede chooseTile, or droppables for next tile are missed
	console.log(filledPlaces);
	// Tiles:
    if (tileCount === 19) {
        // Finishing bonus:
        setStatus("Game Complete!");
		setMode('finished');
        hiddenScore += 500;
		calcScore();
		displayNonZeroScores();
		showHighscores();
		return;
    }
	else if (bay.length === 0) {
		chooseTile();
	}
	// Scoring:
	calcScore();
    displayNonZeroScores();
	calcBoni();
	// Messaging:
    setStatus();
    //showMessage(tileCount + " tiles played");		// BECAME ANNOYING
}


/*********************/
/*! VISUAL FUNCTIONS */
/*********************/
function setStatus(message) {
	// Message mode:
	if (message) {
		$('scorestatus').set('text', message);
		return;
	}
	// Score-reflecting mode:
    var statuses = {
        100: 'Getting going...',
        300: 'Looking good...',
        500: 'Nice work!',
        700: 'Cha-ching!',
        900: 'Keep it coming!',
        1100: 'Make it rain baby!',
        1500: 'You da man!',
        2000: 'Mastering it...',
        3000: 'Hex fiend!',
        5000: 'Hexual Ceiling!'
    };
    var status = "";
    // Find our current level:
    Object.keys(statuses).forEach(function (key) {
        if (totalScore < key) return;
        status = statuses[key];     // Will be set to the highest entry our score exceeds
    });
    // Apply to page:
    $('scorestatus').set('text', status);
}

function showMessage(msg, className, isSticky) {
	if (typeof className == 'undefined') className = '';
	if (typeof isSticky == 'undefined') isSticky = false;

    // Create a new message <p> element:
    var para = new Element('p', {
        styles: { 'opacity': 0, 'margin-top': '20px' },
        html: msg
    }).addClass(className)
	  .inject($('messages'));

	// Fade in & slide up:
    var anim = new Fx.Morph(para, {duration: 500});
	anim.start({ 'opacity': 1, 'margin-top': 0 });

	// Remove automatically:
	if (!isSticky) {
		anim.chain(function() {
            // Fade away:
            this.start.delay(2000, this, { 'opacity': 0 });
        })
		.chain(function() {
            para.destroy();
        });
	}
	// Make message cancel button:
	else {
		new Element('a', {
			html: '[cancel]',
			styles: {'cursor': 'pointer'}
		})
		.addEvent('click', function() {
			para.destroy();
			setMode('');
		})
		.inject(para);
	}
}

function clearMessages() {
	$('messages').set('html','');
}


/********************/
/*! BOARD FUNCTIONS */
/********************/
function findValidPlaces() {
	// Remove all valid classes:
	$$('#board .place').removeClass('valid');
	var validPlaces = [];

	if (filledPlaces.length > 0) {
		var fl = filledPlaces.length;
		// Combine all the sets of neighbours:
		for (var i=0; i < fl; i++) {
			validPlaces.combine(p[filledPlaces[i]].nb);
		}
		// Then erase the already filled places:
		for (var j=0; j < fl; j++) {
			validPlaces.erase(filledPlaces[j]);
		}
	}
	else {	// All valid
		validPlaces = Object.keys(p);
	}

	// Convert the locations (e.g. '11') to HTML elements (<div id="p11"...):
	validPlaces.forEach(function(id) {
		$('p'+id).addClass('valid');
	});

	return validPlaces;
}

function unsetPlace(place) {
	place.removeClass('filled');
	// Unset place value:
	var placeId = parseInt(place.id.slice(1));
	p[placeId].val = [0,0,0];
	findValidPlaces();
}

function setMode(mode) {
	$('gamearea').removeClass('move recycle');
	clearMessages();

	switch(mode) {
		case 'move':
			if (totalScore < costs.move) {
				showMessage("You don't have $costs.move.");
			}
			else if(tileCount > 0 && tileCount < 19) {
				gameMode = mode;
				$('gamearea').addClass(mode);
				showMessage("Move mode enabled.", 'construction', true);
			}
			break;

		case 'recycle':
			if (totalScore < costs.recycle) {
				showMessage("You don't have $"+costs.recycle);
			}
			else if (tileCount > 0) {
				gameMode = mode;
				$('gamearea').addClass(mode);
				showMessage("Recycle mode enabled.", 'construction', true);
			}
			break;

		case '':
			gameMode = '';
			showMessage("mode disabled");
			break;

		case 'finished':
			$('gamearea').addClass(mode);
			gameMode = mode;
			// Disable game menu:
			$('menu').destroy();

		default:
			break;
	}
}

function undo() {			// FIXME using game state history, not second-guessing last move
	if (totalScore < costs.undo) {
		showMessage("You don't have $"+costs.undo);
	}
	else {
		// Clear bay:
		$$('#bay .tile').inject($('bank'));
		bay = [];
		// Reset last filled place:
		var lastPlaceId = filledPlaces.pop();
		$('p'+lastPlaceId).removeClass("filled");
		p[lastPlaceId].val = [0,0,0];
		// Tile back to bay:
		chooseTile(lastTile.id);
		hiddenScore -= costs.undo;
		updateState();
	}
}


/************/
/*! SCORING */
/************/
/* Scoring axes:
	x = vertical (1,5,9)
	y = rising left (3,4,8)
	z = rising right (2,6,7)
*/

var tileScores = {
	x1:0, x2:0, x3:0, x4:0, x5:0,
	y1:0, y2:0, y3:0, y4:0, y5:0,
	z1:0, z2:0, z3:0, z4:0, z5:0
};
var linesScore = 0;
var hiddenScore = 0;
var totalScore = 0;

// Check whether a line of tiles all match:
function lineSum(tiles, axis) {
    // Zeros are not valid:
    if (tiles[0].val[axis] === 0) return 0;
    // Check all against first:
    for (var i = 1; i < tiles.length; i++) {
        if (tiles[i].val[axis] !== tiles[0].val[axis]) return 0;
    }
    // All tiles matched in value if we got this far:
    return tileSum(tiles, axis);
}

// Sum a line of tiles:
function tileSum(tiles, axis) {
    var sum = tiles[0].val[axis];
    // Add all to first:
    for (var i = 1; i < tiles.length; i++) {
        sum += tiles[i].val[axis];
    }
    // All were equal if we got this far:
    return sum;
}

function calcScore() {
    tileScores.x1 = 10 * lineSum([p[11], p[12], p[13]], 0);
    tileScores.x2 = 10 * lineSum([p[21], p[22], p[23], p[24]], 0);
    tileScores.x3 = 10 * lineSum([p[31], p[32], p[33], p[34], p[35]], 0);
    tileScores.x4 = 10 * lineSum([p[41], p[42], p[43], p[44]], 0);
    tileScores.x5 = 10 * lineSum([p[51], p[52], p[53]], 0);

    tileScores.y1 = 10 * lineSum([p[31], p[41], p[51]], 1);
    tileScores.y2 = 10 * lineSum([p[21], p[32], p[42], p[52]], 1);
    tileScores.y3 = 10 * lineSum([p[11], p[22], p[33], p[43], p[53]], 1);
    tileScores.y4 = 10 * lineSum([p[12], p[23], p[34], p[44]], 1);
    tileScores.y5 = 10 * lineSum([p[13], p[24], p[35]], 1);

    tileScores.z1 = 10 * lineSum([p[11], p[21], p[31]], 2);
    tileScores.z2 = 10 * lineSum([p[12], p[22], p[32], p[41]], 2);
    tileScores.z3 = 10 * lineSum([p[13], p[23], p[33], p[42], p[51]], 2);
    tileScores.z4 = 10 * lineSum([p[24], p[34], p[43], p[52]], 2);
    tileScores.z5 = 10 * lineSum([p[35], p[44], p[53]], 2);

	// Reset and re-tally score:
	linesScore = 0;
	for (var i in tileScores) {
		linesScore += tileScores[i];
	}
	return linesScore;
}

function displayNonZeroScores() {
    // Display line scores on edge tiles:
    $('f14').set('text', tileScores.x1 > 0 ? '$' + tileScores.x1 : '');
    $('f25').set('text', tileScores.x2 > 0 ? '$' + tileScores.x2 : '');
    $('f36').set('text', tileScores.x3 > 0 ? '$' + tileScores.x3 : '');
    $('f45').set('text', tileScores.x4 > 0 ? '$' + tileScores.x4 : '');
    $('f54').set('text', tileScores.x5 > 0 ? '$' + tileScores.x5 : '');

    $('f20').set('text', tileScores.y1 > 0 ? '$' + tileScores.y1 : '');
    $('f10').set('text', tileScores.y2 > 0 ? '$' + tileScores.y2 : '');
    $('f00').set('text', tileScores.y3 > 0 ? '$' + tileScores.y3 : '');
    $('f01').set('text', tileScores.y4 > 0 ? '$' + tileScores.y4 : '');
    $('f02').set('text', tileScores.y5 > 0 ? '$' + tileScores.y5 : '');

    $('f40').set('text', tileScores.z1 > 0 ? '$' + tileScores.z1 : '');
    $('f50').set('text', tileScores.z2 > 0 ? '$' + tileScores.z2 : '');
    $('f60').set('text', tileScores.z3 > 0 ? '$' + tileScores.z3 : '');
    $('f61').set('text', tileScores.z4 > 0 ? '$' + tileScores.z4 : '');
    $('f62').set('text', tileScores.z5 > 0 ? '$' + tileScores.z5 : '');

    // Style edge tiles:
    $$('.edge').each(function(el) {
        if (el.get('text').length > 0) {
            el.addClass('scoring');
        }
        else {
            el.removeClass('scoring');
        }
    });

    // Display main score:
    totalScore = linesScore + hiddenScore;
	$('score').set('text', '$' + totalScore);
}

function calcBoni() {
	// Count scoring lines:
	var scoring = Object.values(tileScores).filter(val => val > 0).length;
	if (scoring === 9) awardBonus(3);
	else if (scoring === 6) awardBonus(2);
	else if (scoring === 3) awardBonus(1);
}

function awardBonus(key) {
	console.log("Awarding bonus", key);
	var boni = {
		1: {bonus: 100, msg: "Greenfields: $10 bonus awarded!"},
		2: {bonus: 200, msg: "Expander: $20 bonus awarded!"},
		3: {bonus: 300, msg: "Super Developer: $30 bonus awarded!"}
	};
	if (boni[key]) {
		hiddenScore += boni[key].bonus;
		showMessage(boni[key].msg);
		// Unset bonus so it only unlocks once:
		boni[key] = false;
	}
}


/*****************/
/*! SERVER COMMS */
/*****************/
// Deliver top scores to client first
// On first tile placed, post to server, telling ip/country/sessionid -> add record
// On game end, (ask name), post score, moves, sequence (?) -> update record
// Prompt for a name, display table
// See where score places in high scores

function showHighscores() {
	// Clear out container:
	$('highscores').getElement('tbody').set('html','');

	new Request.JSON({
		log: true,
		method: 'get',
		url: 'js/scores.json',
		onRequest: function() {
			console.log(this);
		},
		onComplete: function(entries) {
			console.log(entries);
			entries.sortBy('-score');
			entries.forEach(function(entry) {
				// Build up a table row:
				var tr = new Element('tr');
				new Element('td', { html: entry.country }).inject(tr);
				new Element('td', { html: entry.name }).inject(tr);
				new Element('td', { html: entry.score }).inject(tr);
				//  Insert into document:
				tr.inject($('highscores').getElement('tbody'));
			});
			$('highscores').addClass('open');
		}
	}).send();
}

function geoLookup() {
	// IP test:
	new Request.JSONP({
		log: true,
	//	url: 'http://jsonip.com/',
		url: 'http://freegeoip.net/json',	// works when not ad-blocked
	//	url: 'http://api.ipify.org?format=jsonp',
		callbackKey: 'callback',
		onRequest: function() {
			console.log('...');
		},
		onComplete: function(data) {
			console.log('1', data);
			user.ip = data.ip;
			user.country = data.country_code;
		}
	}).send();
}

function newRecord() {
	user.session = '';
	user.timestamp = new Date();

	new Request.JSON({
		url: '',
		data: user,
		onComplete: function() {
			console.log("Record initialised.");
		}
	}).send();
}

function submitScore(user) {
	user.timestamp = new Date();
	// Check user object:
	if ((user.hasOwnProperty('name') && user.name.length > 0) &&
		(user.hasOwnProperty('score') && typeof user.score === 'Number') &&
		(user.hasOwnProperty('ip') && user.ip.length > 0)) {

		new Request.JSON({
			url: '',
			data: user,
			onComplete: function() {
				console.log("Thanks for your score.");
			}
		}).send();
	}
}



/*************/
/*! DOMREADY */
/*************/
// Mootools document ready:
window.addEvent('domready', function() {

	generateBoard();
	generateTiles();
	//console.log(allTiles);	// ok
	chooseTile();

	/**************/
	/*! LISTENERS */
	/**************/
	$('gamearea').addEvent('click', function(event) {
		// Close menus:
		if (event.target.id !== 'menu') { $('menu').removeClass('open'); }
		if (event.target.id !== 'prices') { $('prices').removeClass('open'); }
	});

	$$('.place').addEvent('click:relay(.tile)', function(event, target) {	// Delegate from .place, so future children will react
		placeId = parseInt(target.getParent().id.slice(1));
		console.log(target.id, placeId);

		// Recycling a placed tile:
		if ($('gamearea').hasClass('recycle')) {
			filledPlaces.erase(placeId);
			$('p'+placeId).removeClass('filled').addClass('valid');
			// Do it:
			thisTile = allTiles[target.id.slice(1)];
			thisTile.recycle();
		}
		// Moving a placed tile:
		else if ($('gamearea').hasClass('move')) {
			filledPlaces.erase(placeId);
			$('p'+placeId).addClass('valid');
			// Do it:
			thisTile = allTiles[target.id.slice(1)];
			thisTile.move();
		}
		// Clear special mode:
		setMode('');
	});

	// Name form submission:
	$('submitscore').addEvent('submit', function(e) {
		e.preventDefault();
		//new Event(e).stop();
		console.log(this);
		// User object gains name from form & score from game:
		user.name = this.name;
		user.score = totalScore;
		submitScore();
	});

	// Key listeners:
	document.addEvent('keydown', function(e) {
		if (e.code == 77) setMode('move');						// 'm'
		if (e.code == 82) setMode('recycle');					// 'r'
		if (e.code == 85) undo();								// 'u'
		if (e.code == 81) hiddenScore += 100; displayNonZeroScores();		// 'q'
	});

});
