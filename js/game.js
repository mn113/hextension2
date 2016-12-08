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

var boardCoords = [11,12,13,21,22,23,24,31,32,33,34,35,41,42,43,44,51,52,53];
var edgeCoords =  ['00','01','02','03',10,14,20,25,30,36,40,45,50,54,60,61,62,63];  // ADD 1 to eliminate strings?

var p = {		// could be combined with boardCoords
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

var gamearea = $('gamearea');

var allTiles = {};	// necessary?

var tileCount = 0;

var lastTile;

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

	t.upNext = function() {
		t.el.inject($('bay'), 'top')
			.addClass('current')
			.setStyles({
				'top':'10px',
				'left':'4px'
			});
	};

	t.makeDraggable = function() {
		// Set up draggability:
		var tileDrag = new Drag.Move(t.el, {
			droppables: $$('.valid'),
			container: gamearea,
			precalculate: false,		// improves performance
			snap: 10,
			onDrop: function(element, droppable) {
				// Can we really drop here?
				if (!droppable || !droppable.hasClass('valid')) {
					console.log(droppable);
					t.springBack();
				}
				// If dropped on board place:
				else {
					// Remove draggability:
					tileDrag.detach();
					// Drop it:
					console.log(t.el.get('id')+' dropped into '+droppable.get('id'));
					t.el.inject(droppable);
					t.el.removeClass('current');
					// Store the tile's values:
					t.addToBoard(parseInt(droppable.get('id').substr(1,2), 10)); 	// e.g. 53;
				}
				// Zero tile position whether in bay or in board place:
				t.el.setStyles({
					'top': '-36px',		// WOULD ONLY WORK FOR BOARD
					'left': 0
				});
			}
		});
	};

	t.springBack = function() {
		var animation = new Fx.Morph(t.el, {duration: 300});
		animation.start({'top': 0, 'left': 0});
		console.log('Sproing!');
	};

	t.addToBoard = function(location) {
		//console.log("Attempt to store "+t.values[0]+", "+t.values[1]+" and "+t.values[2]+" in p"+location);
		// Store values in global board object:
		p[location].val = t.values;
		filledPlaces.push(location);
		$('p'+location).removeClass('valid').addClass('filled');
		// Increment tiles:
		tileCount++;
		lastTile = t;
		stateChange();
	};

	t.removeFromBoard = function() {

	};

	t.recycle = function() {
		$('bank').inject(t.getElement());
	};

	t.move = function() {
		t.makeDraggable();
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
		var tiles = $$('#bank .tile');
		domTile = tiles.getRandom();
	}
	// Select Tile object with that id (chop the 't'):
	var myTile = allTiles[domTile.get("id").slice(1)];
	console.log(myTile);
	// Transfer chosen tile to the bay & make fully draggable:
    myTile.upNext();
    myTile.makeDraggable();
}

function undo() {
	// Clear bay:
	$$('#bay .tile').inject($('bank'));
	// Reset last played tile:
	var lastPlace = filledPlaces.pop();
	$('p'+lastPlace).removeClass("filled");
	//lastTile.upNext();
	//lastTile.makeDraggable();
	chooseTile(lastTile);
	tileCount--;
	stateChange();
}

function stateChange() {
	// Board:
	findValidPlaces();	// must precede chooseTile, or droppables for next tile are missed
	console.log(filledPlaces);
	// Tiles:
	if (tileCount < 19) chooseTile();
    else if (tileCount === 19) {
        // Finishing bonus:
        hiddenScore += 50;
    }
	// Scoring:
	calcScore();
    displayNonZeroScores();
	// Messaging:
    setStatus();
    showMessage(tileCount + " tiles played");
}


/*********************/
/*! VISUAL FUNCTIONS */
/*********************/
function setStatus() {
    var statuses = {
        10: 'Getting going...',
        30: 'Looking good...',
        50: 'Nice work!',
        70: 'Cha-ching!',
        90: 'Keep it coming!',
        110: 'Make it rain baby!',
        150: 'You da man!',
        200: 'Mastering it...',
        300: 'Hex fiend!',
        500: 'Hexual Ceiling!'
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

function showMessage(msg) {
    // Create a new message <p> element:
    var para = new Element('p', {
        styles: { 'opacity': 0, 'margin-top': '20px' },
        html: msg
    }).inject($('messages'));

    var anim = new Fx.Morph(para, {duration: 500});
    // Fade in & slide up:
	anim.start({ 'opacity': 1, 'margin-top': 0 })
        .chain(function() {
            // Fade away:
            this.start.delay(2000, this, { 'opacity': 0 });
        }).chain(function() {
            para.destroy();
        });
}


/********************/
/*! BOARD FUNCTIONS */
/********************/
var filledPlaces = [];	// add to it each turn

function findValidPlaces() {
	var validPlaces = [];
	if (tileCount > 0) {	// because all valid on first turn
		// Remove all valid classes:
		$$('#board .place').removeClass('valid');

		var fl = filledPlaces.length;
		// Combine all the sets of neighbours
		for (var i=0; i < fl; i++) {
			validPlaces.combine(p[filledPlaces[i]].nb);
		}
		// Then erase the already filled places
		for (var j=0; j < fl; j++) {
			validPlaces.erase(filledPlaces[j]);
		}
		// Convert the locations (e.g. '11') to HTML elements (<div id="p11"...)
		validPlaces.forEach(function(id) {
			$('p'+id).addClass('valid');
		});
	}
}

function setMode(mode) {
	if (mode.length > 0) {
		showMessage(mode + " mode enabled");
	}
	else {
		showMessage("mode disabled");
	}
	$('gamearea').removeClass('move recycle')
				 .addClass(mode);
}


/************/
/*! SCORING */
/************/
/* Scoring axes:
	x = vertical (1,5,9)
	y = rising left (3,4,8)
	z = rising right (2,6,7)
*/

var scores = {
	x1:0, x2:0, x3:0, x4:0, x5:0,
	y1:0, y2:0, y3:0, y4:0, y5:0,
	z1:0, z2:0, z3:0, z4:0, z5:0
};
var linesScore = 0;
var hiddenScore = 0;
var totalScore = 0;

function lineSum(tiles, prop) {
    // Zeros are not valid:
    if (tiles[0].val[prop] === 0) return 0;
    // Check all against first:
    for (var i = 1; i < tiles.length; i++) {
        if (tiles[i].val[prop] !== tiles[0].val[prop]) return 0;
    }
    // All were equal if we got this far:
    return tileSum(tiles, prop);
}

function tileSum(tiles, prop) {
    var sum = tiles[0].val[prop];
    // Add all to first:
    for (var i = 1; i < tiles.length; i++) {
        sum += tiles[i].val[prop];
    }
    // All were equal if we got this far:
    return sum;
}

function calcScore() {

    scores.x1 = lineSum([p[11], p[12], p[13]], 0);
    scores.x2 = lineSum([p[21], p[22], p[23], p[24]], 0);
    scores.x3 = lineSum([p[31], p[32], p[33], p[34], p[35]], 0);
    scores.x4 = lineSum([p[41], p[42], p[43], p[44]], 0);
    scores.x5 = lineSum([p[51], p[52], p[53]], 0);

    scores.y1 = lineSum([p[31], p[41], p[51]], 1);
    scores.y2 = lineSum([p[21], p[32], p[42], p[52]], 1);
    scores.y3 = lineSum([p[11], p[22], p[33], p[43], p[53]], 1);
    scores.y4 = lineSum([p[12], p[23], p[34], p[44]], 1);
    scores.y5 = lineSum([p[13], p[24], p[35]], 1);

    scores.z1 = lineSum([p[11], p[21], p[31]], 2);
    scores.z2 = lineSum([p[12], p[22], p[32], p[41]], 2);
    scores.z3 = lineSum([p[13], p[23], p[33], p[42], p[51]], 2);
    scores.z4 = lineSum([p[24], p[34], p[43], p[52]], 2);
    scores.z5 = lineSum([p[35], p[44], p[53]], 2);

	// Reset and re-tally score:
	linesScore = 0;
	for (var i in scores) {
		linesScore += scores[i];
	}
}

function displayNonZeroScores() {
    // Display line scores on edge tiles:
    $('f14').set('text', scores.x1 > 0 ? '$' + scores.x1 : '');
    $('f25').set('text', scores.x2 > 0 ? '$' + scores.x2 : '');
    $('f36').set('text', scores.x3 > 0 ? '$' + scores.x3 : '');
    $('f45').set('text', scores.x4 > 0 ? '$' + scores.x4 : '');
    $('f54').set('text', scores.x5 > 0 ? '$' + scores.x5 : '');

    $('f20').set('text', scores.y1 > 0 ? '$' + scores.y1 : '');
    $('f10').set('text', scores.y2 > 0 ? '$' + scores.y2 : '');
    $('f00').set('text', scores.y3 > 0 ? '$' + scores.y3 : '');
    $('f01').set('text', scores.y4 > 0 ? '$' + scores.y4 : '');
    $('f02').set('text', scores.y5 > 0 ? '$' + scores.y5 : '');

    $('f40').set('text', scores.z1 > 0 ? '$' + scores.z1 : '');
    $('f50').set('text', scores.z2 > 0 ? '$' + scores.z2 : '');
    $('f60').set('text', scores.z3 > 0 ? '$' + scores.z3 : '');
    $('f61').set('text', scores.z4 > 0 ? '$' + scores.z4 : '');
    $('f62').set('text', scores.z5 > 0 ? '$' + scores.z5 : '');

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


/*************/
/*! DOMREADY */
/*************/
// Mootools document ready:
window.addEvent('domready', function() {
	/**************/
	/*! LISTENERS */
	/**************/
	$$('.place').addEvent('click:relay(.tile)', function(event, target) {	// Delegate from .place, so future children will react
		console.log("!");
		console.log(target);

		// Recycling a placed tile:
		if ($('gamearea').hasClass('recycle')) {
			showMessage("Tile deleted.");
			showMessage("You have been charged $40.");
			// Do it:
			allTiles[target.get("id")].recycle();
			hiddenScore -= 40;
		}
		// Moving a placed tile:
		else if ($('gamearea').hasClass('move')) {
			showMessage("You have been charged $70.");
			showMessage("Drag the tile to an empty space.");
			// Do it:
			allTiles[target.get("id")].move();
			hiddenScore -= 70;
		}
		// Clear special mode:
		setMode('');
	});


	generateBoard();
	generateTiles();
	//console.log(allTiles);	// ok
	chooseTile();
});
