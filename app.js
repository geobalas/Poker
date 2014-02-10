var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	http = require('http'),
	path = require('path'),
	url = require('url') ,
	crypto = require('crypto'),
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
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({ key: 'express.sid', secret: 'poker_app' }));
app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));

// Development Only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

var players = [];
var tables = [];
var decks = [];

tables[0] = new Table( 0, 'Sample 10-handed Table', new Deck(), 10, 2, 1, 200, 40, false );
tables[1] = new Table( 1, 'Sample 6-handed Table', new Deck(), 6, 4, 2, 400, 80, false );
tables[2] = new Table( 2, 'Sample 2-handed Table', new Deck(), 2, 8, 4, 800, 160, false );
tables[3] = new Table( 3, 'Sample 6-handed Private Table', new Deck(), 6, 20, 10, 2000, 400, true );

for( var i=0 ; i<4 ; i++ ) {
	decks[i] = new Deck();
}

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

// The 6-seat table markup
app.get('/table_6_handed.html', function( req, res ) {
	res.render('table_6_handed');
});

// The 2-seat table markup
app.get('/table_2_handed.html', function( req, res ) {
	res.render('table_2_handed');
});

// The table data
app.get('/table_data/:table_id', function( req, res ) {
	if( typeof req.params.table_id !== 'undefined' && typeof tables[req.params.table_id] !== 'undefined' ) {
		res.send( { 'table': tables[req.params.table_id].public } );
	}
});

app.get('/table_10/:table_id', function( req, res ) {
	res.redirect('/');
});

io.sockets.on('connection', function( socket ) {
	/**
	 * When a player disconnects
	 */
	socket.on( 'disconnect', function() {
		// If the player was sitting on a table
		if( typeof players[socket.id] !== 'undefined' && players[socket.id].sitting_on_table !== false && tables[players[socket.id].sitting_on_table] !== false ) {
			// The seat on which the player was sitting
			var seat = players[socket.id].seat;
			// The table on which the player was sitting
			var table_id = players[socket.id].sitting_on_table;
			// Remove the player from the seat
			tables[table_id].player_left( seat );
			// Remove the player from the socket room
			socket.leave( 'table-' + table_id );
			// Send the new table data
			if( !tables[table_id].game_is_on ) {
				io.sockets.in( 'table-' + table_id ).emit( 'game_stopped', tables[table_id].public );
			} else {
				io.sockets.in( 'table-' + table_id ).emit( 'table_data', tables[table_id].public );
			}
			// Dettach the player object from the players array so that it can be destroyed by the garbage collector
			delete players[socket.id];
		}
	});

	/**
	 * When a player leaves the table
	 */
	socket.on( 'leave_table', function( callback ) {
		// If the player was sitting on a table
		if( players[socket.id].sitting_on_table !== false && tables[players[socket.id].sitting_on_table] !== false ) {
			// The seat on which the player was sitting
			var seat = players[socket.id].seat;
			// The table on which the player was sitting
			var table_id = players[socket.id].sitting_on_table;
			// Remove the player from the seat
			tables[table_id].player_left( seat );
			// Emit the new table data
			if( !tables[table_id].game_is_on ) {
				io.sockets.in( 'table-' + table_id ).emit( 'game_stopped', tables[table_id].public );
			} else {
				io.sockets.in( 'table-' + table_id ).emit( 'table_data', tables[table_id].public );
			}
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
				// Create the player object
				var player_id = socket.id + Math.ceil(Math.random() * 999999);
				// Creating the player object
				players[socket.id] = new Player( player_id, socket, new_screen_name, 1000 );
				callback( { success: true, screen_name: new_screen_name, total_chips: players[socket.id].chips } );
			} else {
				callback( { success: false } );
			}
		} else {
			callback( { success: false } );
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
				players[socket.id].public.sitting_in = true;
				// Add them to the table data
				tables[data.table_id].seats[data.seat] = players[socket.id];
				tables[data.table_id].player_sat_on_the_table( data.seat );
				// Increase the counters of the table
				tables[data.table_id].public.no_of_players_seated++;
				tables[data.table_id].public.no_of_players_sitting_in++;
				// Give the response to the user
				callback( { 'success': true, 'sitting_on_table': data.table_id } );
				// Add the player to the socket room
				socket.join( 'table-' + data.table_id );
				// If there are no players playing right now, try to initialize a game with the new player
				if( !tables[data.table_id].game_is_on && tables[data.table_id].public.no_of_players_sitting_in > 1 ) {
					// Initialize the game
					tables[data.table_id].initialize_game();
				}
				// Notify the table that the user has sat in
				io.sockets.in( 'table-' + data.table_id ).emit( 'table_data', tables[data.table_id].public );
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
		if( 
			players[socket.id].sitting_on_table
			&& players[socket.id].seat !== null
			&& !players[socket.id].public.sitting_in
		) {
			// Getting the table id from the player object
			var table_id = players[socket.id].sitting_on_table;
			// The player is sitting in
			players[socket.id].public.sitting_in = true;
			tables[table_id].public.no_of_players_sitting_in++;
			// If there are no players playing right now, try to initialize a game with the new player
			if( !tables[table_id].game_is_on && tables[table_id].public.no_of_players_sitting_in > 1 ) {
				// Initialize the game
				tables[table_id].initialize_game();
				// Send the new table data to the players
				io.sockets.in( 'table-' + table_id ).emit( 'table_data', tables[table_id].public );
				// Start asking players to post the small blind
				tables[table_id].player_to_act.socket.emit( 'post_small_blind' );
			} else {
				// Send the new table data to the players
				io.sockets.in( 'table-' + table_id ).emit( 'table_data', tables[table_id].public );
			}
			callback( { 'success': true } );
		}
	});

	/**
	 * When a player posts a blind
	 * @param bool posted_blind (Shows if the user posted the blind or not)
	 */
	socket.on('post_blind', function( posted_blind, callback ) {
		if( players[socket.id].sitting_on_table !== 'undefined' ) {
			var table_id = players[socket.id].sitting_on_table;
			if( tables[table_id] && tables[table_id].player_to_act.socket.id === socket.id && ( tables[table_id].public.phase === 'small_blind' || tables[table_id].public.phase === 'big_blind' ) ) {
				if( posted_blind ) {
					callback( { 'success': true } );
					if( tables[table_id].public.phase === 'small_blind' ) {
						tables[table_id].init_big_blind();
						tables[table_id].action_to_next_player();
						// Start asking players to post the small blind
						tables[table_id].player_to_act.socket.emit( 'post_big_blind' );
					} else {
						tables[table_id].init_preflop();
					}
				} else {
					tables[table_id].player_sat_out( players[socket.id].seat );
					callback( { 'success': true } );
				}
				// Send the new table data to the players
				io.sockets.in( 'table-' + table_id ).emit( 'table_data', tables[table_id].public );
			}
		}
	});

	socket.on('next', function( table_id ) {
		tables[table_id].player_to_act = tables[table_id].player_to_act.next_player;
		tables[table_id].public.active_seat = tables[table_id].player_to_act.seat;
		io.sockets.in( 'table-' + table_id ).emit( 'table_data', tables[table_id].public );
	});
});