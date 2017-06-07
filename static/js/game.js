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

var myHexGame = (function() {

	var filledPlaces = [];	// add to it each turn

	var bay = [];		// must only contain 1 tile

	var p = {			// main board state store
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

	var tileSetup = {	// tile internals
		x: [1,5,9],		// water, sewage, oil
		y: [3,4,8],		// canal, pylons, cable
		z: [2,6,7]		// path, road, rail
	};

	var allTiles = {};	// necessary?

	var tileCount = 0;	// number played

	var lastTile;		// last tile placed

	var gameMode = '';	// '' || 'move' || 'recycle' || 'finished'

	var costs = {
		undo: 75,
		recycle: 225,
		move: 10
	}	// special move costs

	var user = {
		ip: myip,	// should be ready from previous script... maybe
		gameID: new Date().valueOf(),	// unique enough for our purposes
		name: 'Anonymous'
	};	// user object (for highscores)

	var timeagoInstance = timeago();	// for highscores

	var recordCreated = false;		// for analytics/io


	/*********************/
	/*! TILE PSEUDOCLASS */
	/*********************/
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
				container: $('gamearea'),
				precalculate: true,		// improves performance
				snap: 10,
				onStart: function(element) {
					t.el.addClass("current");
					// First tile can be moved anywhere:
					if (gameMode == 'move' && tileCount < 2) {
						$$('#board .place').addClass('valid');
					}
					// Need to detach moving tile from its parent to have flexible z-index:
					if (!isFresh) {
						var parent = t.el.getParent();
						// If parent is a filled place, make it unfilled:
						board.unsetPlace(parent);
						// Begin float:
						parent.addClass('floaty'); 	// raises z-index to 15
					}
				},
				onEnter: function(element, droppable){
					droppable.addClass('over');
			    },
			    onLeave: function(element, droppable){
					droppable.removeClass('over');
			    },
				onDrop: function(element, droppable) {
					// Can we really drop here?
					if (!droppable || !droppable.hasClass('valid')) {
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
						console.log(t.el.id+' dropped into '+droppable.id);

						// Remove tile from bay if it came from there:
						if (isFresh) {
							bay.splice(t.el);
						}
						// Complete special move if moved here from another board place:
						else if (droppable.id !== 'p'+t.location) {
							// Charge:
							scoring.hiddenScore -= costs.move;
							messaging.showMessage("You have been charged $"+costs.move);
							board.updateState();
						}
						// Store the tile's values:
						t.addToBoard(parseInt(droppable.get('id').slice(1))); 	// e.g. 53;
					}
					// Reset all floatiness:
					$$('.place').removeClass('floaty');
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
			// Zero tile position if on board place:
			console.log("Setting top: -36px");
			t.el.setStyles({
				'top': '-36px',	// WORKS FOR BOARD, NOT BAY
				'left': 0
			});
			// Play sound:
			sounds.playSound('drill');
			board.updateState();
		};

		t.recycle = function() {
			// Unset place:
			var parent = t.el.getParent();
			board.unsetPlace(parent);
			// Take tile off the board:
			t.toBank();
			t.location = null;
			// Play sound:
			sounds.playSound('recycle');
			// Admin:
			scoring.hiddenScore -= costs.recycle;
			board.updateState();
			messaging.showMessage("Tile recycled.");
			messaging.showMessage("You have been charged $"+costs.recycle);
		};

		t.move = function() {
			sounds.playSound('pop');
			messaging.showMessage("Drag the tile to an empty space.");
			t.el.setStyles({top: '-54px'});
			t.makeDraggable(false);	// pass in old parent
			// The rest of the special move happens only on drop...
		};

		return t;		// Export the module
	}


	/******************/
	/*! GENERATE GAME */
	/******************/
	var generators = {
		generateTiles: function() {
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
		},

		generateBoard: function() {
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
		},

		generateTrees: function() {
			var treeTiles = {'f03':0.2,'f02':0.3,'f01':0.4,'f00':0.5,'f10':0.6,'f20':0.7,'f30':0.8,'f40':0.7,'f50':0.6,'f60':0.5,'f61':0.4,'f62':0.3,'f63':0.2};

			for (key of Object.keys(treeTiles)) {
				// How many trees on this tile?
				var rNum = Math.ceil(12 * treeTiles[key] * Math.random());
				while (rNum > 0) {
					var rTop = -20 + Math.floor(40 * Math.random()),
						rLeft = 20 + Math.floor(40 * Math.random());
					var tree = new Element('div')
						.addClass('tree')
						// Randomly position:
					 	.setStyles({
							top: rTop,
							left: rLeft,
							zIndex: rTop
				    	});
					// Set snowiness based on hash values:
					if (Math.random() < treeTiles[key]) tree.addClass('snowy');
					// Add to edge tile:
					tree.inject($(key));
					rNum--;
				}
			}
		}
	};


	/*********************/
	/*! VISUAL FUNCTIONS */
	/*********************/
	var messaging = {
		setStatus: function(message) {
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
		        if (scoring.totalScore < key) return;
		        status = statuses[key];     // Will be set to the highest entry our score exceeds
		    });
		    // Apply to page:
		    $('scorestatus').set('text', status);
		},

		showMessage: function(msg, className, isSticky) {
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
					board.setMode('');
				})
				.inject(para);
			}
		},

		clearMessages: function() {
			$('messages').set('html','');
		}
	};


	/********************/
	/*! AUDIO FUNCTIONS */
	/********************/
	var sounds = {		// Empty container for all the sounds to be used
		chaching:{url: 'sfx/chaching.mp3', volume: 60},
		drill:	 {url: 'sfx/drill.mp3', volume: 40},
		pop:	 {url: 'sfx/pop.mp3', volume: 50},
		recycle: {url: 'sfx/recycle.mp3', volume: 50},
		victory: {url: 'sfx/victory.mp3', volume: 50},

		playSound: function(key) {
			var snd = new Audio(sounds[key].url); 	// Audio buffers automatically when created
			snd.volume = sounds[key].volume / 100;
			snd.play();
		}
	};


	/********************/
	/*! BOARD FUNCTIONS */
	/********************/
	var board = {
		findValidPlaces: function() {
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
		},

		unsetPlace: function(place) {
			place.removeClass('filled');
			// Unset place value:
			var placeId = parseInt(place.id.slice(1));
			p[placeId].val = [0,0,0];
			board.findValidPlaces();
		},

		setMode: function(mode) {
			$('gamearea').removeClass('move recycle');
			messaging.clearMessages();

			switch(mode) {
				case 'move':
					if (scoring.totalScore < costs.move) {
						messaging.showMessage("You don't have $"+costs.move);
					}
					else if(tileCount > 0 && tileCount < 19) {
						gameMode = mode;
						$('gamearea').addClass(mode);
						messaging.showMessage("Move mode enabled.", 'construction', true);
					}
					break;

				case 'recycle':
					if (scoring.totalScore < costs.recycle) {
						messaging.showMessage("You don't have $"+costs.recycle);
					}
					else if (tileCount > 0) {
						gameMode = mode;
						$('gamearea').addClass(mode);
						messaging.showMessage("Recycle mode enabled.", 'construction', true);
					}
					break;

				case 'finished':
					$('gamearea').addClass(mode);
					gameMode = mode;
					// Disable game menu:
					$('menu').destroy();
					break;

				case '':
					gameMode = '';
					messaging.showMessage("mode disabled");
					break;

				default:
					break;
			}
		},

		undo: function() {			// FIXME using game state history, not second-guessing last move
			if (scoring.totalScore < costs.undo) {
				messaging.showMessage("You don't have $"+costs.undo);
			}
			else {
				scoring.hiddenScore -= costs.undo;
				// Clear bay:
				$$('#bay .tile').inject($('bank'));
				bay = [];
				// Reset last filled place:
				var lastPlaceId = filledPlaces.pop();
				$('p'+lastPlaceId).removeClass("filled");
				p[lastPlaceId].val = [0,0,0];
				// Play sound:
				sounds.playSound('recycle');
				// Tile back to bay:
				board.chooseTile(lastTile.id);
				board.updateState();
			}
		},

		chooseTile: function(id) {
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
		    myTile.upNext();
		    myTile.makeDraggable(true);
		},

		updateState: function() {
			// Board:
			tileCount = $$('#board .place .tile').length;
			board.findValidPlaces();	// must precede chooseTile, or droppables for next tile are missed
			console.log(filledPlaces);
			// Tiles:
		    if (tileCount === 19) {
		        // Finishing bonus:
		        messaging.setStatus("Game Complete!");
				board.setMode('finished');
				sounds.playSound('victory');
		        scoring.hiddenScore += 500;
				scoring.calcScore();
				scoring.displayNonZeroScores();
				io.showHighscores();
				return;
		    }
			if (tileCount === 1 && recordCreated === false) {
				io.createRecord();
			}
			if (bay.length === 0) {
				board.chooseTile();
			}
			// Scoring:
			scoring.calcScore();
		    scoring.displayNonZeroScores();
			scoring.calcBoni();
			// Messaging:
		    messaging.setStatus();
		}
	};


	/************/
	/*! SCORING */
	/************/
	/* Scoring axes:
		x = vertical (1,5,9)
		y = rising left (3,4,8)
		z = rising right (2,6,7)
	*/
	var scoring = {
		tileScores: {
			x1:0, x2:0, x3:0, x4:0, x5:0,
			y1:0, y2:0, y3:0, y4:0, y5:0,
			z1:0, z2:0, z3:0, z4:0, z5:0
		},
		linesScore: 0,
		hiddenScore: 0,
		totalScore: 0,
		boni: {
			1: {bonus: 100, msg: "Greenfields: $10 bonus awarded!"},
			2: {bonus: 200, msg: "Expander: $20 bonus awarded!"},
			3: {bonus: 300, msg: "Super Developer: $30 bonus awarded!"}
		},

		// Check whether a line of tiles all match:
		lineSum: function(tiles, axis) {
		    // Zeros are not valid:
		    if (tiles[0].val[axis] === 0) return 0;
		    // Check all against first:
		    for (var i = 1; i < tiles.length; i++) {
		        if (tiles[i].val[axis] !== tiles[0].val[axis]) return 0;
		    }
		    // All tiles matched in value if we got this far:
		    return scoring.tileSum(tiles, axis);
		},

		// Sum a line of tiles:
		tileSum: function(tiles, axis) {
		    var sum = tiles[0].val[axis];
		    // Add all to first:
		    for (var i = 1; i < tiles.length; i++) {
		        sum += tiles[i].val[axis];
		    }
		    // All were equal if we got this far:
		    return sum;
		},

		// Add up scoring lines:
		calcScore: function() {
		    scoring.tileScores.x1 = 10 * scoring.lineSum([p[11], p[12], p[13]], 0);
		    scoring.tileScores.x2 = 10 * scoring.lineSum([p[21], p[22], p[23], p[24]], 0);
		    scoring.tileScores.x3 = 10 * scoring.lineSum([p[31], p[32], p[33], p[34], p[35]], 0);
		    scoring.tileScores.x4 = 10 * scoring.lineSum([p[41], p[42], p[43], p[44]], 0);
		    scoring.tileScores.x5 = 10 * scoring.lineSum([p[51], p[52], p[53]], 0);

		    scoring.tileScores.y1 = 10 * scoring.lineSum([p[31], p[41], p[51]], 1);
		    scoring.tileScores.y2 = 10 * scoring.lineSum([p[21], p[32], p[42], p[52]], 1);
		    scoring.tileScores.y3 = 10 * scoring.lineSum([p[11], p[22], p[33], p[43], p[53]], 1);
		    scoring.tileScores.y4 = 10 * scoring.lineSum([p[12], p[23], p[34], p[44]], 1);
		    scoring.tileScores.y5 = 10 * scoring.lineSum([p[13], p[24], p[35]], 1);

			scoring.tileScores.z1 = 10 * scoring.lineSum([p[11], p[21], p[31]], 2);
		    scoring.tileScores.z2 = 10 * scoring.lineSum([p[12], p[22], p[32], p[41]], 2);
		    scoring.tileScores.z3 = 10 * scoring.lineSum([p[13], p[23], p[33], p[42], p[51]], 2);
		    scoring.tileScores.z4 = 10 * scoring.lineSum([p[24], p[34], p[43], p[52]], 2);
		    scoring.tileScores.z5 = 10 * scoring.lineSum([p[35], p[44], p[53]], 2);

			// Reset and re-tally score:
			scoring.linesScore = 0;
			for (var i in scoring.tileScores) {
				scoring.linesScore += scoring.tileScores[i];
			}
			return scoring.linesScore;
		},

		// Render the scores:
		displayNonZeroScores: function() {
		    // Display line scores on edge tiles:
		    if (scoring.tileScores.x1 > 0) $('f14').set('text', '$' + scoring.tileScores.x1);
			if (scoring.tileScores.x2 > 0) $('f25').set('text', '$' + scoring.tileScores.x2);
			if (scoring.tileScores.x3 > 0) $('f36').set('text', '$' + scoring.tileScores.x3);
			if (scoring.tileScores.x4 > 0) $('f45').set('text', '$' + scoring.tileScores.x4);
			if (scoring.tileScores.x5 > 0) $('f54').set('text', '$' + scoring.tileScores.x5);

			if (scoring.tileScores.y1 > 0) $('f20').set('text', '$' + scoring.tileScores.y1);
			if (scoring.tileScores.y2 > 0) $('f10').set('text', '$' + scoring.tileScores.y2);
			if (scoring.tileScores.y3 > 0) $('f00').set('text', '$' + scoring.tileScores.y3);
			if (scoring.tileScores.y4 > 0) $('f01').set('text', '$' + scoring.tileScores.y4);
			if (scoring.tileScores.y5 > 0) $('f02').set('text', '$' + scoring.tileScores.y5);

			if (scoring.tileScores.z1 > 0) $('f40').set('text', '$' + scoring.tileScores.z1);
			if (scoring.tileScores.z2 > 0) $('f50').set('text', '$' + scoring.tileScores.z2);
			if (scoring.tileScores.z3 > 0) $('f60').set('text', '$' + scoring.tileScores.z3);
			if (scoring.tileScores.z4 > 0) $('f61').set('text', '$' + scoring.tileScores.z4);
			if (scoring.tileScores.z5 > 0) $('f62').set('text', '$' + scoring.tileScores.z5);

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
		    var newScore = scoring.linesScore + scoring.hiddenScore;
			if (newScore > scoring.totalScore) sounds.playSound('chaching');
			scoring.totalScore = newScore;

			$('score').set('text', '$' + scoring.totalScore);
		},

		// Determine if a bonus should be applied:
		calcBoni: function() {
			// Count scoring lines:
			var scoringLineCount = Object.values(scoring.tileScores).filter(val => val > 0).length;
			if (scoringLineCount === 9) scoring.awardBonus(3);
			else if (scoringLineCount === 6) scoring.awardBonus(2);
			else if (scoringLineCount === 3) scoring.awardBonus(1);
		},

		// Award the particular bonus:
		awardBonus: function(key) {
			console.log("Awarding bonus", key);
			if (scoring.boni[key]) {
				scoring.hiddenScore += scoring.boni[key].bonus;
				messaging.showMessage(scoring.boni[key].msg);
				// Unset bonus so it only unlocks once:
				scoring.boni[key] = false;
			}
		}
	};


	/*****************/
	/*! SERVER COMMS */
	/*****************/
	// Deliver top scores to client first
	// On first tile placed, post to server, telling ip/country/sessionid -> add record
	// On game end, (ask name), post score, moves, sequence (?) -> update record
	// Prompt for a name, display table
	// See where score places in high scores
	var io = {
		// Get highscores from API & display them
		showHighscores: function() {
			// Clear out container:
			$('highscores').getElement('tbody').set('html','');

			new Request.JSON({
				method: 'GET',
				url: '/api/scores/10',
				onComplete: function(entries) {
					console.log(entries);
					entries.forEach(function(entry) {
						// Build up a table row:
						var tr = new Element('tr');
						var flag = new Element('img', {
							src: 'img/1x1transp.png',
							class: 'flag flag-'+entry.country.toLowerCase(),
							alt: entry.country
						});
						new Element('td').grab(flag).inject(tr);
						new Element('td', { html: entry.name }).inject(tr);
						new Element('td', { html: entry.score }).inject(tr);
						new Element('td', { datetime: entry.timestamp, class: 'time' }).inject(tr);
						//  Insert into document:
						tr.inject($('highscores').getElement('tbody'));
					});
					// Fuzzify timestamps:
					timeagoInstance.render($$('.time'));
					$('highscores').addClass('open');
				}
			}).get();
		},

		// Post to API when a game is started (record IP, date, gameID)
		createRecord: function() {
			// Create a unique gameID to serve as the sessionID / db primary key:
			user.timestamp = new Date();
			user.tiles = tileCount;
			user.score = scoring.totalScore;

			new Request.JSON({
				method: 'PUT',
				emulation: false,	// send a true PUT request, not a POST + meta-crap
				url: '/api/scores',
				data: user,
				onComplete: function(resp) {
					if (resp == 200) {
						recordCreated = true;
						console.log("Record initialised.");
					}
				}
			}).put();
		},

		// Post a new score record or update existing gameID?
		submitScore: function() {
			// Fill out user object with game data:
			user.timestamp = new Date();
			user.tiles = tileCount;
			user.score = totalScore;

			// Check user object:
			if ((user.hasOwnProperty('name') && user.name.length > 0) &&
				(user.hasOwnProperty('score') && typeof user.score === 'number') &&
				(user.hasOwnProperty('ip') && user.ip.length > 0)) {

				new Request({
					method: "POST",
					url: '/api/scores',
					data: user,
					onComplete: function(resp) {
						if (resp == 200) console.log("Record updated.");
					}
				}).post();
			}
		}
	}


	// Expose minimum publicly:
	return {
		generators: generators,
		board: board,
		io: io,
		gameMode: gameMode,
		allTiles: allTiles,
		filledPlaces: filledPlaces,
		user: user
	}

})();

/*************/
/*! DOMREADY */
/*************/
// Mootools document ready:
window.addEvent('domready', function() {

	myHexGame.generators.generateBoard();
	myHexGame.generators.generateTiles();
	myHexGame.generators.generateTrees();
	//console.log(allTiles);	// ok
	myHexGame.board.chooseTile();

	/**************/
	/*! LISTENERS */
	/**************/
	window.panelFx = new Fx.Tween('panel', {
		duration: 1000,
		property: 'transform'
	});
	window.panelFx.set = function(values) {
		var targetRotation = 180;
		var rotatedStyle = "rotateZ(" + (targetRotation * values[0].value) + "deg)";
		//console.log(values[0].value, rotatedStyle);
		$('panel').setStyles({transform: rotatedStyle});
	};
	window.hidePanel = function() {
		window.panelFx.start(0,1).chain(function() {
			$('panel').fade('out');
		});
	};

	// Close menus:
	$('gamearea').addEvent('click', function(event) {
		if (event.target.id !== 'menu' && myHexGame.gameMode !== 'finished') {
			$('menu').removeClass('open');
		}
		if (event.target.id !== 'prices') {
			$('prices').removeClass('open');
		}
	});

	$$('.place').addEvent('click:relay(.tile)', function(event, target) {	// Delegate from .place, so future children will react
		var placeId = parseInt(target.getParent().id.slice(1));
		var thisTile;
		console.log(target.id, placeId);

		// Recycling a placed tile:
		if ($('gamearea').hasClass('recycle')) {
			myHexGame.filledPlaces.erase(placeId);
			$('p'+placeId).removeClass('filled').addClass('valid');
			// Do it:
			thisTile = myHexGame.allTiles[target.id.slice(1)];
			thisTile.recycle();
		}
		// Moving a placed tile:
		else if ($('gamearea').hasClass('move')) {
			myHexGame.filledPlaces.erase(placeId);
			$('p'+placeId).addClass('valid');
			// Do it:
			thisTile = myHexGame.allTiles[target.id.slice(1)];
			thisTile.move();
		}
		// Clear special mode:
		myHexGame.board.setMode('');
	});

	// Name form submission:
	$('submitscore').addEvent('submit', function(e) {
		e.preventDefault();
		//new Event(e).stop();
		// User object gains name from form:
		myHexGame.user.name = $('myname').value;
		myHexGame.io.submitScore();
	});

	// Key listeners:
	document.addEvent('keydown', function(e) {
		if (myHexGame.gameMode === '') {
			if (e.code == 77) myHexGame.board.setMode('move');			// 'm'
			if (e.code == 82) myHexGame.board.setMode('recycle');		// 'r'
			if (e.code == 85) myHexGame.board.undo();					// 'u'
		}
	});

});
