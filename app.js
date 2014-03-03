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
	Deck = require('./poker_modules/deck');

app.set('port', process.env.PORT || 3000);
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

server.listen(3000);
console.log('Listening on port 3000');

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
		if( !tables[table_id].private_table ) {
			lobby_tables[table_id] = {};
			lobby_tables[table_id].id = tables[table_id].public.id;
			lobby_tables[table_id].name = tables[table_id].public.name;
			lobby_tables[table_id].no_of_seats = tables[table_id].public.no_of_seats;
			lobby_tables[table_id].players_sitting = tables[table_id].public.no_of_players_seated;
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
	 */
	socket.on('enter_room', function( data ) {
		if( typeof players[socket.id] !== 'undefined' && players[socket.id].room === null ) {
			// Add the player to the socket room
			socket.join( 'table-' + data.table_id );
			// Add the room to the player's data
			players[socket.id].room = data.table_id;
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
	 */
	socket.on('register', function( data, callback ) {
		// If a new screen name is posted
		if( typeof data.new_screen_name !== 'undefined' ) {
			var new_screen_name = data.new_screen_name.trim();
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
					// Create the player object
					var player_id = socket.id + Math.ceil(Math.random() * 999999);
					// Creating the player object
					players[socket.id] = new Player( player_id, socket, new_screen_name, 1000 );
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
			&& data.seat < tables[data.table_id].public.no_of_seats
			// The seat is empty
			&& typeof tables[data.table_id].seats[data.seat].public === 'undefined'
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
				// Remove the chips that player will have on the table, from the player object
				players[socket.id].chips -= data.chips;
				players[socket.id].public.chips_in_play = data.chips;
				// Add the table info in the player object
				players[socket.id].seat = data.seat;
				players[socket.id].sitting_on_table = data.table_id;

				// Give the response to the user
				callback( { 'success': true } );
				// Add the player to the table
				tables[data.table_id].player_sat_on_the_table( players[socket.id], data.seat );
			}
		} else {
			// If the user is not allowed to sit in, notify the user
			callback( { 'success': false } );
		}
	});

	/**
	 * When a player who sits on the table but is not sitting in, requests to sit in
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
	 */
	socket.on('post_blind', function( posted_blind, callback ) {
		if( players[socket.id].sitting_on_table !== false ) {
			var table_id = players[socket.id].sitting_on_table;
			if( tables[table_id] && typeof tables[table_id].player_to_act.public !== 'undefined' && tables[table_id].player_to_act.socket.id === socket.id && ( tables[table_id].public.phase === 'small_blind' || tables[table_id].public.phase === 'big_blind' ) ) {
				if( posted_blind ) {
					callback( { 'success': true } );
					if( tables[table_id].public.phase === 'small_blind' ) {
						tables[table_id].init_big_blind();
					} else {
						// The player posted the big blind
						tables[table_id].init_preflop();
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
	 */
	socket.on('check', function( callback ){
		if( players[socket.id].sitting_on_table !== 'undefined' ) {
			var table_id = players[socket.id].sitting_on_table;
			if( tables[table_id] && tables[table_id].player_to_act.socket.id === socket.id && !tables[table_id].raised_pot && ['preflop','flop','turn','river'].indexOf(tables[table_id].public.phase) > -1 ) {
				// Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
				callback( { 'success': true } );
				if( tables[table_id].last_player_to_act.socket.id === socket.id ) {
					tables[table_id].end_phase();
				} else {
					tables[table_id].action_to_next_player();
				}
			}
		}
	});

	/**
	 * When a message is sent
	 */
	socket.on('send_message', function( message ) {
		message = message.trim();
		if( message && players[socket.id].room ) {
			socket.broadcast.to( 'table-' + players[socket.id].room ).emit( 'receive_message', { 'message': html_entities( message ), 'sender': players[socket.id].public.name } );
		}
	});
});

var event_emitter = function( table_id ) {
	return function ( event_name, event_data ) {
		io.sockets.in( 'table-' + table_id ).emit( event_name, event_data );
	}
}

function html_entities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

tables[0] = new Table( 0, 'Sample 10-handed Table', new Deck(), event_emitter(0), 10, 2, 1, 200, 40, false );
tables[1] = new Table( 1, 'Sample 6-handed Table', new Deck(), event_emitter(1), 6, 4, 2, 400, 80, false );
tables[2] = new Table( 2, 'Sample 2-handed Table', new Deck(), event_emitter(2), 2, 8, 4, 800, 160, false );
tables[3] = new Table( 3, 'Sample 6-handed Private Table', new Deck(), event_emitter(3), 6, 20, 10, 2000, 400, true );