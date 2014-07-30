var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	http = require('http'),
	path = require('path'),
	url = require('url') ,
	connect = require('connect'),
	Table = require('./poker_modules/table'),
	Player = require('./poker_modules/player'),
	Deck = require('./poker_modules/deck'),
	Pot = require('./poker_modules/pot');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));


// Development Only
if ( 'development' == app.get('env') ) {
	app.use( express.errorHandler() );
}

var players = [];
var tables = [];
var event_emitter = {};

var port = process.env.PORT || 3000;
server.listen(port);
console.log('Listening on port ' + port);

// The lobby
app.get('/', function( req, res ) {
	res.render('index');
});

// The lobby markup
app.get('/lobby.html', function( req, res ) {
	res.render( 'lobby', { 'tables': tables } );
});

// The lobby data (the array of tables and their data)
app.get('/lobby_data', function( req, res ) {
	var lobby_tables = [];
	for ( var table_id in tables ) {
		// Sending the public data of the public tables to the lobby screen
		if( !tables[table_id].private_table ) {
			lobby_tables[table_id] = {};
			lobby_tables[table_id].id = tables[table_id].public.id;
			lobby_tables[table_id].name = tables[table_id].public.name;
			lobby_tables[table_id].seats_count = tables[table_id].public.seats_count;
			lobby_tables[table_id].players_seated_count = tables[table_id].public.players_seated_count;
			lobby_tables[table_id].big_blind = tables[table_id].public.big_blind;
			lobby_tables[table_id].small_blind = tables[table_id].public.small_blind;
		}
	}
	res.send( lobby_tables );
});

// The 10-seat table markup
app.get('/table_10_handed.html', function( req, res ) {
	res.render('table_10_handed');
});

// If the table is requested manually, redirect to lobby
app.get('/table_10/:table_id', function( req, res ) {
	res.redirect('/');
});

// The 6-seat table markup
app.get('/table_6_handed.html', function( req, res ) {
	res.render('table_6_handed');
});

// If the table is requested manually, redirect to lobby
app.get('/table_6/:table_id', function( req, res ) {
	res.redirect('/');
});

// The 2-seat table markup
app.get('/table_2_handed.html', function( req, res ) {
	res.render('table_2_handed');
});

// If the table is requested manually, redirect to lobby
app.get('/table_2/:table_id', function( req, res ) {
	res.redirect('/');
});

// The table data
app.get('/table_data/:table_id', function( req, res ) {
	if( typeof req.params.table_id !== 'undefined' && typeof tables[req.params.table_id] !== 'undefined' ) {
		res.send( { 'table': tables[req.params.table_id].public } );
	}
});

io.sockets.on('connection', function( socket ) {

	/**
	 * When a player enters a room
	 * @param object table_data
	 */
	socket.on('enter_room', function( table_id ) {
		if( typeof players[socket.id] !== 'undefined' && players[socket.id].room === null ) {
			// Add the player to the socket room
			socket.join( 'table-' + table_id );
			// Add the room to the player's data
			players[socket.id].room = table_id;
		}
	});

	/**
	 * When a player leaves a room
	 */
	socket.on('leave_room', function() {
		if( typeof players[socket.id] !== 'undefined' && players[socket.id].room !== null && players[socket.id].sitting_on_table === false ) {
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
			if( players[socket.id].sitting_on_table !== false && tables[players[socket.id].sitting_on_table] !== false ) {
				// The seat on which the player was sitting
				var seat = players[socket.id].seat;
				// The table on which the player was sitting
				var table_id = players[socket.id].sitting_on_table;
				// Remove the player from the seat
				tables[table_id].player_left( seat );
			}
			// Remove the player object from the players array
			delete players[socket.id];
		}
	});

	/**
	 * When a player leaves the table
	 * @param function callback
	 */
	socket.on('leave_table', function( callback ) {
		// If the player was sitting on a table
		if( players[socket.id].sitting_on_table !== false && tables[players[socket.id].sitting_on_table] !== false ) {
			// The seat on which the player was sitting
			var seat = players[socket.id].seat;
			// The table on which the player was sitting
			var table_id = players[socket.id].sitting_on_table;
			// Remove the player from the seat
			tables[table_id].player_left( seat );
			// Send the number of total chips back to the user
			callback( { 'success': true, 'total_chips': players[socket.id].chips } );
		}
	});

	/**
	 * When a new player enters the application
	 * @param string new_screen_name
	 * @param function callback
	 */
	socket.on('register', function( new_screen_name, callback ) {
		// If a new screen name is posted
		if( typeof new_screen_name !== 'undefined' ) {
			var new_screen_name = new_screen_name.trim();
			// If the new screen name is not an empty string
			if( new_screen_name && typeof players[socket.id] === 'undefined' ) {
				var name_exists = false;
				for( var i in players ) {
					if( players[i].public.name && players[i].public.name == new_screen_name ) {
						name_exists = true;
						break;
					}
				}
				if( !name_exists ) {
					// Creating the player object
					players[socket.id] = new Player( socket, new_screen_name, 1000 );
					callback( { 'success': true, screen_name: new_screen_name, total_chips: players[socket.id].chips } );
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
	socket.on('sit_on_the_table', function( data, callback ) {
		if( 
			// A seat has been specified
			typeof data.seat !== 'undefined'
			// A table id is specified
			&& typeof data.table_id !== 'undefined'
			// The table exists
			&& typeof tables[data.table_id] !== 'undefined'
			// The seat number is an integer and less than the total number of seats
			&& typeof data.seat === 'number'
			&& data.seat >= 0 
			&& data.seat < tables[data.table_id].public.seats_count
			&& typeof players[socket.id] !== 'undefined'
			// The seat is empty
			&& tables[data.table_id].seats[data.seat] == null
			// The player isn't sitting on any other tables
			&& players[socket.id].sitting_on_table === false
			// The player had joined the room of the table
			&& players[socket.id].room === data.table_id
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
			else if( data.chips > tables[data.table_id].public.max_buy_in || data.chips < tables[data.table_id].public.min_buy_in )
				callback( { 'success': false, 'error': 'The amount of chips should be between the maximum and the minimum amount of allowed buy in' } );
			else {
				// Give the response to the user
				callback( { 'success': true } );
				// Add the player to the table
				tables[data.table_id].player_sat_on_the_table( players[socket.id], data.seat, data.chips );
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
	socket.on('sit_in', function( callback ) {
		if( players[socket.id].sitting_on_table && players[socket.id].seat !== null && !players[socket.id].public.sitting_in ) {
			// Getting the table id from the player object
			var table_id = players[socket.id].sitting_on_table;
			tables[table_id].player_sat_in( players[socket.id].seat );
			callback( { 'success': true } );
		}
	});

	/**
	 * When a player posts a blind
	 * @param bool posted_blind (Shows if the user posted the blind or not)
	 * @param function callback
	 */
	socket.on('post_blind', function( posted_blind, callback ) {
		if( players[socket.id].sitting_on_table !== false ) {
			var table_id = players[socket.id].sitting_on_table;
			console.log( table_id );
			var active_seat = tables[table_id].public.active_seat;

			if( tables[table_id] 
				&& typeof tables[table_id].seats[active_seat].public !== 'undefined' 
				&& tables[table_id].seats[active_seat].socket.id === socket.id 
				&& ( tables[table_id].public.phase === 'small_blind' || tables[table_id].public.phase === 'big_blind' ) 
			) {
				if( posted_blind ) {
					callback( { 'success': true } );
					if( tables[table_id].public.phase === 'small_blind' ) {
						// The player posted the small blind
						tables[table_id].player_posted_small_blind();
					} else {
						// The player posted the big blind
						tables[table_id].player_posted_big_blind();
					}
				} else {
					tables[table_id].player_sat_out( players[socket.id].seat );
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
		if( players[socket.id].sitting_on_table !== 'undefined' ) {
			var table_id = players[socket.id].sitting_on_table;
			var active_seat = tables[table_id].public.active_seat;

			if( tables[table_id] 
				&& tables[table_id].seats[active_seat].socket.id === socket.id 
				&& !tables[table_id].public.biggest_bet || ( tables[table_id].public.phase === 'preflop' && tables[table_id].public.biggest_bet === players[socket.id].public.bet )
				&& ['preflop','flop','turn','river'].indexOf(tables[table_id].public.phase) > -1 
			) {
				// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
				callback( { 'success': true } );
				tables[table_id].player_checked();
			}
		}
	});

	/**
	 * When a player folds
	 * @param function callback
	 */
	socket.on('fold', function( callback ){
		if( players[socket.id].sitting_on_table !== 'undefined' ) {
			var table_id = players[socket.id].sitting_on_table;
			var active_seat = tables[table_id].public.active_seat;

			if( tables[table_id] && tables[table_id].seats[active_seat].socket.id === socket.id && ['preflop','flop','turn','river'].indexOf(tables[table_id].public.phase) > -1 ) {
				// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
				callback( { 'success': true } );
				tables[table_id].player_folded();
			}
		}
	});

	/**
	 * When a player calls
	 * @param function callback
	 */
	socket.on('call', function( callback ){
		if( players[socket.id].sitting_on_table !== 'undefined' ) {
			var table_id = players[socket.id].sitting_on_table;
			var active_seat = tables[table_id].public.active_seat;

			if( tables[table_id] && tables[table_id].seats[active_seat].socket.id === socket.id && tables[table_id].public.biggest_bet && ['preflop','flop','turn','river'].indexOf(tables[table_id].public.phase) > -1 ) {
				// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
				callback( { 'success': true } );
				tables[table_id].player_called();
			}
		}
	});

	/**
	 * When a player bets
	 * @param number amount
	 * @param function callback
	 */
	socket.on('bet', function( amount, callback ){
		if( players[socket.id].sitting_on_table !== 'undefined' ) {
			var table_id = players[socket.id].sitting_on_table;
			var active_seat = tables[table_id].public.active_seat;

			if( tables[table_id] && tables[table_id].seats[active_seat].socket.id === socket.id && !tables[table_id].public.biggest_bet && ['preflop','flop','turn','river'].indexOf(tables[table_id].public.phase) > -1 ) {
				// Validating the bet amount
				amount = parseInt( amount );
				if ( amount && isFinite( amount ) && amount <= tables[table_id].seats[active_seat].public.chips_in_play ) {
					// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
					callback( { 'success': true } );
					tables[table_id].player_betted( amount ); 
				}
			}
		}
	});

	/**
	 * When a player raises
	 * @param function callback
	 */
	socket.on('raise', function( amount, callback ){
		if( players[socket.id].sitting_on_table !== 'undefined' ) {
			var table_id = players[socket.id].sitting_on_table;
			var active_seat = tables[table_id].public.active_seat;
			
			if(
				// The table exists
				typeof tables[table_id] !== 'undefined' 
				// The player who should act is the player who raised
				&& tables[table_id].seats[active_seat].socket.id === socket.id
				// The pot was betted 
				&& tables[table_id].public.biggest_bet
				// It's not a round of blinds
				&& ['preflop','flop','turn','river'].indexOf(tables[table_id].public.phase) > -1
				// Not every other player is all in (in which case the only move is "call")
				&& !tables[table_id].other_players_are_all_in()
			) {
				amount = parseInt( amount );
				if ( amount && isFinite( amount ) ) {
					amount -= tables[table_id].seats[active_seat].public.bet;
					if( amount <= tables[table_id].seats[active_seat].public.chips_in_play ) {
						// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
						callback( { 'success': true } );
						console
						// The amount should not include amounts previously betted
						tables[table_id].player_raised( amount );
					}
				}
			}
		}
	});

	/**
	 * When a message from a player is sent
	 * @param string message
	 */
	socket.on('send_message', function( message ) {
		message = message.trim();
		if( message && players[socket.id].room ) {
			socket.broadcast.to( 'table-' + players[socket.id].room ).emit( 'receive_message', { 'message': html_entities( message ), 'sender': players[socket.id].public.name } );
		}
	});
});

/**
 * Event emitter function that will be sent to the table objects
 * Tables use the event_emitter in order to send events to the client
 * and update the table data in the ui
 * @param string table_id
 */
var event_emitter = function( table_id ) {
	return function ( event_name, event_data ) {
		io.sockets.in( 'table-' + table_id ).emit( event_name, event_data );
	}
}

/**
 * Changes certain characters in a string to html entities
 * @param string str
 */
function html_entities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

tables[0] = new Table( 0, 'Sample 10-handed Table', event_emitter(0), 10, 2, 1, 200, 40, false );
tables[1] = new Table( 1, 'Sample 6-handed Table', event_emitter(1), 6, 4, 2, 400, 80, false );
tables[2] = new Table( 2, 'Sample 2-handed Table', event_emitter(2), 2, 8, 4, 800, 160, false );
tables[3] = new Table( 3, 'Sample 6-handed Private Table', event_emitter(3), 6, 20, 10, 2000, 400, true );