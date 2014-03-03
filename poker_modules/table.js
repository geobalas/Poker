/**
 * The table "class"
 * @param string	id (the table id)
 * @param string	name (the name of the table)
 * @param object 	deck (the deck object that the table will use)
 * @param function 	event_emitter (function that emits the events to the players of the room)
 * @param int 		no_of_seats (the total number of players that can play on the table)
 * @param int 		big_blind (the current big blind)
 * @param int 		small_blind (the current small_blind)
 * @param int 		max_buy_in (the maximum amount of chips that one can bring to the table)
 * @param int 		min_buy_in (the minimum amount of chips that one can bring to the table)
 * @param bool 		private_table (flag that shows whether the table will be shown in the lobby)
 */
var Table = function( id, name, deck, event_emitter, no_of_seats, big_blind, small_blind, max_buy_in, min_buy_in, private_table ) {
	// All the public table data
	this.public = {
		// The table id
		id: id,
		// The table name
		name: name,
		// The number of the seats of the table
		no_of_seats: no_of_seats,
		// The big blind amount
		big_blind: big_blind,
		// The small blind amount
		small_blind: small_blind,
		// The minimum allowed buy in
		min_buy_in: min_buy_in,
		// The maximum allowed buy in
		max_buy_in: max_buy_in,
		// The number of players that are currently seated
		no_of_players_seated: 0,
		// The number of players who receive cards at the begining of each round
		no_of_players_sitting_in: 0,
		// The amount of chips that are in the pot
		pot: null,
		// The seat of the dealer
		dealer_seat: null,
		// The seat of the active player
		active_seat: null,
		// The public data of the players, indexed by their seats
		seats: [],
		// The phase of the game ('small_blind', 'big_blind', 'preflop'... etc)
		phase: null,
		// The cards on the board
		board: ['', '', '', '', '']
	};
	// Reference to the dealer player object
	this.dealer = {};
	// Reference to the player who acts last in this deal (originally the dealer, the player before them if they fold and so on)
	this.last_position = {};
	// Reference to the player that is acting
	this.player_to_act = {};
	// Reference to the last player that will act in the current phase (originally the dealer, unless there are bets in the pot)
	this.last_player_to_act = {};
	// The game has begun
	this.game_is_on = false;
	// The game has only two players
	this.heads_up = false;
	// The table is not displayed in the lobby
	this.private_table = private_table;
	// The number of players that currently hold cards in their hands
	this.no_of_players_in_hand = 0;
	// References to all the player objects in the table, indexed by seat number
	this.seats = [];
	// The deck of the table
	this.deck = deck;
	// If the pot has been raised for the current round
	this.betted_pot = false;
	// The function that emits the events of the table
	this.event_emitter = event_emitter;
	// Initializing the empty seats
	for( var i=0 ; i<this.public.no_of_seats ; i++ ) {
		this.seats[i] = {};
	}
}

/**
 * Method that makes the doubly linked list of players
 */
Table.prototype.link_players = function() {
	if( this.public.no_of_players_sitting_in < 2 ) {
		 return false;	
	}

	this.no_of_players_in_hand = 0;
	// The seat number of the first player of the link
	var first_player_seat = false;
	// An object that points to the current player that is being added to the list
	var current_player = {};

	// For each seat
	for( var i=0 ; i<this.public.no_of_seats ; i++ ) {
		// If a player is sitting on the current seat
		if( typeof this.seats[i].public !== 'undefined' && this.seats[i].public.sitting_in ) {
			// Keep the seat on which the first player is sitting, so that
			// they can be linked to the last player in the end
			if( first_player_seat === false ) {
				first_player_seat = i;
				current_player = this.seats[i];
			} else {
				current_player.next_player = this.seats[i];
				this.seats[i].previous_player = current_player;
				current_player = this.seats[i];
			}
			current_player.public.in_hand = true;
			this.no_of_players_in_hand++;
			current_player.cards = [];
			current_player.public.has_cards = false;
		}
	}

	// Linking the last player with the first player in order to form the "circle"
	current_player.next_player = this.seats[first_player_seat];
	this.seats[first_player_seat].previous_player = current_player;

	return true;
}

/**
 * Method that starts a new game
 */
Table.prototype.initialize_game = function() {
	if( this.public.no_of_players_sitting_in > 1 ) {
		// The game is on now
		this.game_is_on = true;
		this.public.board = ['', '', '', '', ''];
		this.deck.shuffle();
		this.heads_up = this.public.no_of_players_sitting_in === 2;
		// Creating the linked list of players
		this.link_players();

		// Giving the dealer button to a random player
		if( typeof this.dealer.public == 'undefined' ) {
			var random_dealer_seat = Math.floor( Math.random() * this.public.no_of_players_sitting_in );	
			var current_player = {};
			// Assinging the dealer button to the random player
			for( var i=0 ; i<=this.public.no_of_seats-1 ; i++ ) {
				if( typeof this.seats[i].public !== 'undefined' && this.seats[i].public.sitting_in ) {
					current_player = this.seats[i];
					for( var j=0 ; j<=random_dealer_seat ; j++ ) {
						current_player = current_player.next_player;
					}
					this.public.dealer_seat = current_player.seat;
					this.dealer = current_player;
				}
			}
		}

		// The last player to act in every phase
		this.last_position = this.dealer;
		this.public.dealer_seat = this.dealer.seat;
		this.init_small_blind();
	}
}

/**
 * Method that starts a new round
 */
Table.prototype.new_round = function() {
	if( this.game_is_on && this.public.no_of_players_sitting_in > 1 ) {
		this.public.board = ['', '', '', '', ''];
		this.deck.shuffle();
		this.heads_up = this.public.no_of_players_sitting_in === 2;
		// Creating the linked list of players
		this.link_players();

		// If there is no dealer or if the dealer sat out
		if( typeof this.dealer.public == 'undefined' || !this.dealer.public.sitting_in ) {
			// Assinging the dealer button to the player sitting on the seat
			// right after the dealer who left or sat out
			var found_new_dealer = false;
			// Starting from the previous dealer seat, and checking each seat until the last seat
			for( var i=this.public.dealer_seat ; i<=this.public.no_of_seats-1 ; i++ ) {
				if( typeof this.seats[i].public !== 'undefined' && this.seats[i].public.sitting_in ) {
					this.dealer = this.seats[i];
					found_new_dealer = true;
					break;
				}
			}
			// Checking the seats from the beginning of the table (the seats before the seat of the last dealer)
			if( !found_new_dealer ) {
				for( var i=0 ; i<this.public.dealer_seat ; i++ ) {
					if( typeof this.seats[i].public !== 'undefined' && this.seats[i].public.sitting_in ) {
						this.dealer = this.seats[i];
						break;
					}
				}
			}
		// If there is a dealer, just assign the dealer button to the next player
		} else {
			this.dealer = this.dealer.next_player;
		}

		// The last player to act in every phase
		this.last_position = this.dealer;
		this.public.dealer_seat = this.dealer.seat;
		this.init_small_blind();
	}
}

/**
 * Method that starts the "small blind" round
 */
Table.prototype.init_small_blind = function() {
	// Set the table phase to 'small_blind'
	this.public.phase = 'small_blind';

	// If it's a heads up match, the dealer posts the small blind
	if( this.heads_up ) {
		this.player_to_act = this.dealer;
		this.last_player_to_act = this.dealer.next_player;
	} else {
		this.player_to_act = this.dealer.next_player;
		this.last_player_to_act = this.dealer;
	}

	this.public.active_seat = this.player_to_act.seat;
	// Start asking players to post the small blind
	this.player_to_act.socket.emit('post_small_blind');
	this.event_emitter( 'table_data', this.public );
}

/**
 * Method that starts the "small blind" round
 */
Table.prototype.init_big_blind = function() {
	// Set the table phase to 'big_blind'
	this.public.phase = 'big_blind';
	this.action_to_next_player();
}

/**
 * Method that starts the "preflop" round
 */
Table.prototype.init_preflop = function() {
	// Set the table phase to 'preflop'
	this.public.phase = 'preflop';
	var current_player = this.player_to_act;
	// The player that placed the big blind is the last player to act for the round
	this.last_player_to_act = this.player_to_act;

	for( var i=0 ; i<this.no_of_players_in_hand ; i++ ) {
		current_player.cards = this.deck.deal( 2 );
		current_player.public.has_cards = true;
		current_player.socket.emit( 'dealing_cards', current_player.cards );
		current_player = current_player.next_player;
	}

	this.action_to_next_player();
}

/**
 * Method that starts the next phase of the round
 */
Table.prototype.init_next_phase = function() {
	switch( this.public.phase ) {
		case 'preflop':
			this.public.phase = 'flop';
			this.public.board = this.deck.deal( 3 ).concat(  ['', ''] );
			break;
		case 'flop':
			this.public.phase = 'turn';
			this.public.board[3] = this.deck.deal( 1 )[0];
			break;
		case 'turn':
			this.public.phase = 'river';
			this.public.board[4] = this.deck.deal( 1 )[0];
			break;
	}

	this.betted_pot = false;
	this.player_to_act = this.last_position.next_player;
	this.public.active_seat = this.player_to_act.seat;
	this.last_player_to_act = this.last_position;
	this.event_emitter( 'table_data', this.public );
	this.player_to_act.socket.emit('act_not_betted_pot');
}

/**
 * Making the next player the active one
 */
Table.prototype.action_to_next_player = function() {
	this.player_to_act = this.player_to_act.next_player;
	this.public.active_seat = this.player_to_act.seat;

	switch( this.public.phase ) {
		case 'small_blind':
			this.player_to_act.socket.emit( 'post_small_blind' );
			break;
		case 'big_blind':
			this.player_to_act.socket.emit( 'post_big_blind' );
			break;
		case 'preflop':
			this.player_to_act.socket.emit( 'act_betted_pot' );
			break;
		case 'flop':
			if( this.betted_pot ) {
				this.player_to_act.socket.emit( 'act_betted_pot' );
			} else {
				this.player_to_act.socket.emit( 'act_not_betted_pot' );
			}
			break;
		case 'turn':
			if( this.betted_pot ) {
				this.player_to_act.socket.emit( 'act_betted_pot' );
			} else {
				this.player_to_act.socket.emit( 'act_not_betted_pot' );
			}
			break;
		case 'river':
			if( this.betted_pot ) {
				this.player_to_act.socket.emit( 'act_betted_pot' );
			} else {
				this.player_to_act.socket.emit( 'act_not_betted_pot' );
			}
			break;
	}

	this.event_emitter( 'table_data', this.public );
}

/**
 * Ends the current phase of the round
 */
Table.prototype.end_phase = function() {
	switch( this.public.phase ) {
		case 'preflop':
		case 'flop':
		case 'turn':
			this.init_next_phase();
			break;
		case 'river':
			this.new_round();
			break;
	}
}

/**
 * Adds the player to the table
 * @param object 	player
 * @param int 		seat
 */
Table.prototype.player_sat_on_the_table = function( player, seat ) {
	this.seats[seat] = player;
	this.public.seats[seat] = player.public;

	// Increase the counters of the table
	this.public.no_of_players_seated++;
	
	this.player_sat_in( seat );
}

/**
 * Adds a player who is sitting on the table, to the game
 * @param int seat
 */
Table.prototype.player_sat_in = function( seat ) {
	// The player is sitting in
	this.seats[seat].public.sitting_in = true;
	this.public.no_of_players_sitting_in++;
	
	this.event_emitter( 'table_data', this.public );

	// If there are no players playing right now, try to initialize a game with the new player
	if( !this.game_is_on && this.public.no_of_players_sitting_in > 1 ) {
		// Initialize the game
		this.initialize_game();
	}
}

/**
 * Changes the data of the table when a player leaves
 * @param int seat
 */
Table.prototype.player_left = function( seat ) {
	// If someone is really sitting on that seat
	if( this.seats[seat].id ) {
		var next_action = '';
		// If the player is sitting in, make them sit out first
		if( this.seats[seat].public.sitting_in ) {
			next_action = this.player_sat_out( seat, true );
		}

		this.seats[seat].leave_table();
		// Empty the seat
		this.public.seats[seat] = {};
		this.public.no_of_players_seated--;

		// If there are not enough players to continue the game
		if( this.public.no_of_players_seated < 2 ) {
			this.dealer = {};
			this.public.dealer_seat = null;
			this.last_position = {};
		}

		this.seats[seat] = {};
		this.event_emitter( 'table_data', this.public );

		// If a player left a heads-up match and there are people waiting to play, start a new round
		if( next_action == 'new_round' ) {
			this.new_round();
		}
		// Else if the player was the last to act in this phase, end the phase
		else if( next_action == 'end_phase' ) {
			this.end_phase();
		}
	}
}

/**
 * Changes the data of the table when a player sits out
 * @param int 	seat 			(the numeber of the seat)
 * @param bool 	player_left		(flag that shows that the player actually left the table)
 * @return bool start_new_round	(shows whether a new round should start after the player sat down or not)
 */
Table.prototype.player_sat_out = function( seat, player_left ) {
	// Set the player_left parameter to false if it's not specified
	if( typeof player_left == 'undefined' ) {
		player_left = false;
	}
	// start_new_round will be set to true, if the player has left and
	// a new round should be started after removing the player data completely
	var next_action = '';
	this.public.no_of_players_sitting_in--;
	// If there are not enough players sitting in, stop the game
	if( this.public.no_of_players_sitting_in < 2 ) {
		this.seats[seat].sit_out();
		this.stop_game();
	}
	// If the player was playing in the current round
	else if( this.seats[seat].public.in_hand ) {
		this.no_of_players_in_hand--;
		// If there were only two players but there are more players sitting in, waiting to play, start a new round
		if ( this.seats[seat].previous_player.id == this.seats[seat].next_player.id ) {
			this.seats[seat].sit_out();
			if( !player_left ) {
				this.new_round();
			} else {
				next_action = 'new_round';
			}
		} else {
			// If the player was the last player to act in the rounds and the game will continue,
			// the last player to act will be the previous player
			if( this.last_position.seat === seat ) {
				this.last_position = this.last_position.previous_player;
			}
			// If the player was not the last player to act but they were the player who should act in this round
			if( this.player_to_act.seat === seat && ( this.last_player_to_act.seat !== seat ) ) {
				this.action_to_next_player();
			}
			// If the player was the dealer
			if( this.public.dealer_seat === seat ) {
				this.dealer = this.dealer.previous_player;
				this.public.dealer_seat = this.dealer.seat;
			}
			// If the player was the last player to act in this phase and the game will continue,
			// the last player to act will be the previous player
			if( this.last_player_to_act.seat === seat ) {
				this.last_player_to_act = this.last_player_to_act.previous_player;

				// If the player was the last player to act and they left when they had to act
				if( this.player_to_act.seat === seat ) {
					this.seats[seat].sit_out();
					if( !player_left ) {
						this.end_phase();
					} else {
						next_action = 'end_phase';
					}
				} 
			} else {
				this.seats[seat].sit_out();
			}
		}
	} else {
		this.seats[seat].sit_out();
	}
	this.event_emitter( 'table_data', this.public );
	return next_action;
}

/**
 * Method that makes the doubly linked list of players
 */
Table.prototype.remove_all_cards_from_play = function() {
	// For each seat
	for( var i=0 ; i<this.public.no_of_seats ; i++ ) {
		// If a player is sitting on the current seat
		if( typeof this.seats[i].public !== 'undefined' ) {
			this.seats[i].cards = [];
			this.seats[i].public.has_cards = false;
		}
	}
}

/**
 * Method that stops the game
 */
Table.prototype.stop_game = function() {
	this.public.phase = null;
	this.public.pot = null;
	this.public.active_seat = null;
	this.public.board = ['', '', '', '', ''];
	this.player_to_act = {};
	this.last_player_to_act = {};
	this.remove_all_cards_from_play();
	this.game_is_on = false;
	this.event_emitter( 'game_stopped', this.public );
}

module.exports = Table;