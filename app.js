var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	lessMiddleware = require('less-middleware'),
	path = require('path'),
	Table = require('./poker_modules/table'),
	Player = require('./poker_modules/player');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(app.router);
app.use(lessMiddleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// Development Only
if ( 'development' == app.get('env') ) {
	app.use( express.errorHandler() );
}

var players = [];
var tables = [];
var eventEmitter = {};

var port = process.env.PORT || 3000;
server.listen(port);
console.log('Listening on port ' + port);

// The lobby
app.get('/', function( req, res ) {
	res.render('index');
});

// The lobby data (the array of tables and their data)
app.get('/lobby-data', function( req, res ) {
	var lobbyTables = [];
	for ( var tableId in tables ) {
		// Sending the public data of the public tables to the lobby screen
		if( !tables[tableId].privateTable ) {
			lobbyTables[tableId] = {};
			lobbyTables[tableId].id = tables[tableId].public.id;
			lobbyTables[tableId].name = tables[tableId].public.name;
			lobbyTables[tableId].seatsCount = tables[tableId].public.seatsCount;
			lobbyTables[tableId].playersSeatedCount = tables[tableId].public.playersSeatedCount;
			lobbyTables[tableId].bigBlind = tables[tableId].public.bigBlind;
			lobbyTables[tableId].smallBlind = tables[tableId].public.smallBlind;
		}
	}
	res.send( lobbyTables );
});

// If the table is requested manually, redirect to lobby
app.get('/table-10/:tableId', function( req, res ) {
	res.redirect('/');
});

// If the table is requested manually, redirect to lobby
app.get('/table-6/:tableId', function( req, res ) {
	res.redirect('/');
});

// If the table is requested manually, redirect to lobby
app.get('/table-2/:tableId', function( req, res ) {
	res.redirect('/');
});

// The table data
app.get('/table-data/:tableId', function( req, res ) {
	if( typeof req.params.tableId !== 'undefined' && typeof tables[req.params.tableId] !== 'undefined' ) {
		res.send( { 'table': tables[req.params.tableId].public } );
	}
});

io.sockets.on('connection', function( socket ) {

	/**
	 * When a player enters a room
	 * @param object table-data
	 */
	socket.on('enterRoom', function( tableId ) {
		if( typeof players[socket.id] !== 'undefined' && players[socket.id].room === null ) {
			// Add the player to the socket room
			socket.join( 'table-' + tableId );
			// Add the room to the player's data
			players[socket.id].room = tableId;
		}
	});

	/**
	 * When a player leaves a room
	 */
	socket.on('leaveRoom', function() {
		if( typeof players[socket.id] !== 'undefined' && players[socket.id].room !== null && players[socket.id].sittingOnTable === false ) {
			// Remove the player from the socket room
			socket.leave( 'table-' + players[socket.id].room );
			// Remove the room to the player's data
			players[socket.id].room = null;
		}
	});

	/**
	 * When a player disconnects
	 */
	socket.on('disconnect', function() {
		// If the socket points to a player object
		if( typeof players[socket.id] !== 'undefined' ) {
			// If the player was sitting on a table
			if( players[socket.id].sittingOnTable !== false && typeof tables[players[socket.id].sittingOnTable] !== 'undefined' ) {
				// The seat on which the player was sitting
				var seat = players[socket.id].seat;
				// The table on which the player was sitting
				var tableId = players[socket.id].sittingOnTable;
				// Remove the player from the seat
				tables[tableId].playerLeft( seat );
			}
			// Remove the player object from the players array
			delete players[socket.id];
		}
	});

	/**
	 * When a player leaves the table
	 * @param function callback
	 */
	socket.on('leaveTable', function( callback ) {
		// If the player was sitting on a table
		if( players[socket.id].sittingOnTable !== false && tables[players[socket.id].sittingOnTable] !== false ) {
			// The seat on which the player was sitting
			var seat = players[socket.id].seat;
			// The table on which the player was sitting
			var tableId = players[socket.id].sittingOnTable;
			// Remove the player from the seat
			tables[tableId].playerLeft( seat );
			// Send the number of total chips back to the user
			callback( { 'success': true, 'totalChips': players[socket.id].chips } );
		}
	});

	/**
	 * When a new player enters the application
	 * @param string newScreenName
	 * @param function callback
	 */
	socket.on('register', function( newScreenName, callback ) {
		// If a new screen name is posted
		if( typeof newScreenName !== 'undefined' ) {
			var newScreenName = newScreenName.trim();
			// If the new screen name is not an empty string
			if( newScreenName && typeof players[socket.id] === 'undefined' ) {
				var nameExists = false;
				for( var i in players ) {
					if( players[i].public.name && players[i].public.name == newScreenName ) {
						nameExists = true;
						break;
					}
				}
				if( !nameExists ) {
					// Creating the player object
					players[socket.id] = new Player( socket, newScreenName, 1000 );
					callback( { 'success': true, screenName: newScreenName, totalChips: players[socket.id].chips } );
				} else {
					callback( { 'success': false, 'message': 'This name is taken' } );
				}
			} else {
				callback( { 'success': false, 'message': 'Please enter a screen name' } );
			}
		} else {
			callback( { 'success': false, 'message': '' } );
		}
	});

	/**
	 * When a player requests to sit on a table
	 * @param function callback
	 */
	socket.on('sitOnTheTable', function( data, callback ) {
		if( 
			// A seat has been specified
			typeof data.seat !== 'undefined'
			// A table id is specified
			&& typeof data.tableId !== 'undefined'
			// The table exists
			&& typeof tables[data.tableId] !== 'undefined'
			// The seat number is an integer and less than the total number of seats
			&& typeof data.seat === 'number'
			&& data.seat >= 0 
			&& data.seat < tables[data.tableId].public.seatsCount
			&& typeof players[socket.id] !== 'undefined'
			// The seat is empty
			&& tables[data.tableId].seats[data.seat] == null
			// The player isn't sitting on any other tables
			&& players[socket.id].sittingOnTable === false
			// The player had joined the room of the table
			&& players[socket.id].room === data.tableId
			// The chips number chosen is a number
			&& typeof data.chips !== 'undefined'
			&& !isNaN(parseInt(data.chips)) 
			&& isFinite(data.chips)
			// The chips number is an integer
			&& data.chips % 1 === 0
		){
			// The chips the player chose are less than the total chips the player has
			if( data.chips > players[socket.id].chips )
				callback( { 'success': false, 'error': 'You don\'t have that many chips' } );
			else if( data.chips > tables[data.tableId].public.maxBuyIn || data.chips < tables[data.tableId].public.minBuyIn )
				callback( { 'success': false, 'error': 'The amount of chips should be between the maximum and the minimum amount of allowed buy in' } );
			else {
				// Give the response to the user
				callback( { 'success': true } );
				// Add the player to the table
				tables[data.tableId].playerSatOnTheTable( players[socket.id], data.seat, data.chips );
			}
		} else {
			// If the user is not allowed to sit in, notify the user
			callback( { 'success': false } );
		}
	});

	/**
	 * When a player who sits on the table but is not sitting in, requests to sit in
	 * @param function callback
	 */
	socket.on('sitIn', function( callback ) {
		if( players[socket.id].sittingOnTable !== false && players[socket.id].seat !== null && !players[socket.id].public.sittingIn ) {
			// Getting the table id from the player object
			var tableId = players[socket.id].sittingOnTable;
			tables[tableId].playerSatIn( players[socket.id].seat );
			callback( { 'success': true } );
		}
	});

	/**
	 * When a player posts a blind
	 * @param bool postedBlind (Shows if the user posted the blind or not)
	 * @param function callback
	 */
	socket.on('postBlind', function( postedBlind, callback ) {
		if( players[socket.id].sittingOnTable !== false ) {
			var tableId = players[socket.id].sittingOnTable;
			var activeSeat = tables[tableId].public.activeSeat;

			if( tables[tableId] 
				&& typeof tables[tableId].seats[activeSeat].public !== 'undefined' 
				&& tables[tableId].seats[activeSeat].socket.id === socket.id 
				&& ( tables[tableId].public.phase === 'smallBlind' || tables[tableId].public.phase === 'bigBlind' ) 
			) {
				if( postedBlind ) {
					callback( { 'success': true } );
					if( tables[tableId].public.phase === 'smallBlind' ) {
						// The player posted the small blind
						tables[tableId].playerPostedSmallBlind();
					} else {
						// The player posted the big blind
						tables[tableId].playerPostedBigBlind();
					}
				} else {
					tables[tableId].playerSatOut( players[socket.id].seat );
					callback( { 'success': true } );
				}
			}
		}
	});

	/**
	 * When a player checks
	 * @param function callback
	 */
	socket.on('check', function( callback ){
		if( players[socket.id].sittingOnTable !== 'undefined' ) {
			var tableId = players[socket.id].sittingOnTable;
			var activeSeat = tables[tableId].public.activeSeat;

			if( tables[tableId] 
				&& tables[tableId].seats[activeSeat].socket.id === socket.id 
				&& !tables[tableId].public.biggestBet || ( tables[tableId].public.phase === 'preflop' && tables[tableId].public.biggestBet === players[socket.id].public.bet )
				&& ['preflop','flop','turn','river'].indexOf(tables[tableId].public.phase) > -1 
			) {
				// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
				callback( { 'success': true } );
				tables[tableId].playerChecked();
			}
		}
	});

	/**
	 * When a player folds
	 * @param function callback
	 */
	socket.on('fold', function( callback ){
		if( players[socket.id].sittingOnTable !== false ) {
			var tableId = players[socket.id].sittingOnTable;
			var activeSeat = tables[tableId].public.activeSeat;

			if( tables[tableId] && tables[tableId].seats[activeSeat].socket.id === socket.id && ['preflop','flop','turn','river'].indexOf(tables[tableId].public.phase) > -1 ) {
				// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
				callback( { 'success': true } );
				tables[tableId].playerFolded();
			}
		}
	});

	/**
	 * When a player calls
	 * @param function callback
	 */
	socket.on('call', function( callback ){
		if( players[socket.id].sittingOnTable !== 'undefined' ) {
			var tableId = players[socket.id].sittingOnTable;
			var activeSeat = tables[tableId].public.activeSeat;

			if( tables[tableId] && tables[tableId].seats[activeSeat].socket.id === socket.id && tables[tableId].public.biggestBet && ['preflop','flop','turn','river'].indexOf(tables[tableId].public.phase) > -1 ) {
				// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
				callback( { 'success': true } );
				tables[tableId].playerCalled();
			}
		}
	});

	/**
	 * When a player bets
	 * @param number amount
	 * @param function callback
	 */
	socket.on('bet', function( amount, callback ){
		if( players[socket.id].sittingOnTable !== 'undefined' ) {
			var tableId = players[socket.id].sittingOnTable;
			var activeSeat = tables[tableId].public.activeSeat;

			if( tables[tableId] && tables[tableId].seats[activeSeat].socket.id === socket.id && !tables[tableId].public.biggestBet && ['preflop','flop','turn','river'].indexOf(tables[tableId].public.phase) > -1 ) {
				// Validating the bet amount
				amount = parseInt( amount );
				if ( amount && isFinite( amount ) && amount <= tables[tableId].seats[activeSeat].public.chipsInPlay ) {
					// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
					callback( { 'success': true } );
					tables[tableId].playerBetted( amount ); 
				}
			}
		}
	});

	/**
	 * When a player raises
	 * @param function callback
	 */
	socket.on('raise', function( amount, callback ){
		if( players[socket.id].sittingOnTable !== 'undefined' ) {
			var tableId = players[socket.id].sittingOnTable;
			var activeSeat = tables[tableId].public.activeSeat;
			
			if(
				// The table exists
				typeof tables[tableId] !== 'undefined' 
				// The player who should act is the player who raised
				&& tables[tableId].seats[activeSeat].socket.id === socket.id
				// The pot was betted 
				&& tables[tableId].public.biggestBet
				// It's not a round of blinds
				&& ['preflop','flop','turn','river'].indexOf(tables[tableId].public.phase) > -1
				// Not every other player is all in (in which case the only move is "call")
				&& !tables[tableId].otherPlayersAreAllIn()
			) {
				amount = parseInt( amount );
				if ( amount && isFinite( amount ) ) {
					amount -= tables[tableId].seats[activeSeat].public.bet;
					if( amount <= tables[tableId].seats[activeSeat].public.chipsInPlay ) {
						// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
						callback( { 'success': true } );
						// The amount should not include amounts previously betted
						tables[tableId].playerRaised( amount );
					}
				}
			}
		}
	});

	/**
	 * When a message from a player is sent
	 * @param string message
	 */
	socket.on('sendMessage', function( message ) {
		message = message.trim();
		if( message && players[socket.id].room ) {
			socket.broadcast.to( 'table-' + players[socket.id].room ).emit( 'receiveMessage', { 'message': htmlEntities( message ), 'sender': players[socket.id].public.name } );
		}
	});
});

/**
 * Event emitter function that will be sent to the table objects
 * Tables use the eventEmitter in order to send events to the client
 * and update the table data in the ui
 * @param string tableId
 */
var eventEmitter = function( tableId ) {
	return function ( eventName, eventData ) {
		io.sockets.in( 'table-' + tableId ).emit( eventName, eventData );
	}
}

/**
 * Changes certain characters in a string to html entities
 * @param string str
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

tables[0] = new Table( 0, 'Sample 10-handed Table', eventEmitter(0), 10, 2, 1, 200, 40, false );
tables[1] = new Table( 1, 'Sample 6-handed Table', eventEmitter(1), 6, 4, 2, 400, 80, false );
tables[2] = new Table( 2, 'Sample 2-handed Table', eventEmitter(2), 2, 8, 4, 800, 160, false );
tables[3] = new Table( 3, 'Sample 6-handed Private Table', eventEmitter(3), 6, 20, 10, 2000, 400, true );