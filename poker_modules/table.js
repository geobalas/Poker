/**
 * The table "class"
 * @param string	id (the table id)
 * @param string	name (the name of the table)
 * @param object 	deck (the deck object that the table will use)
 * @param function 	event_emitter (function that emits the events to the players of the room)
 * @param int 		seats_count (the total number of players that can play on the table)
 * @param int 		big_blind (the current big blind)
 * @param int 		small_blind (the current small_blind)
 * @param int 		max_buy_in (the maximum amount of chips that one can bring to the table)
 * @param int 		min_buy_in (the minimum amount of chips that one can bring to the table)
 * @param bool 		private_table (flag that shows whether the table will be shown in the lobby)
 */
var Table = function( id, name, deck, event_emitter, seats_count, big_blind, small_blind, max_buy_in, min_buy_in, private_table ) {
	// All the public table data
	this.public = {
		// The table id
		'id': id,
		// The table name
		'name': name,
		// The number of the seats of the table
		'seats_count': seats_count,
		// The number of players that are currently seated
		'players_seated_count': 0,
		// The big blind amount
		'big_blind': big_blind,
		// The small blind amount
		'small_blind': small_blind,
		// The minimum allowed buy in
		'min_buy_in': min_buy_in,
		// The maximum allowed buy in
		'max_buy_in': max_buy_in,
		// The amount of chips that are in the pot
		'pot': 0,
		// The biggest bet of the table in the current phase
		'biggest_bet': 0,
		// The seat of the dealer
		'dealer_seat': null,
		// The seat of the active player
		'active_seat': null,
		// The public data of the players, indexed by their seats
		'seats': [],
		// The phase of the game ('small_blind', 'big_blind', 'preflop'... etc)
		'phase': null,
		// The cards on the board
		'board': ['', '', '', '', ''],
		// Log of an action, displayed in the chat
		'log': {
			'message': '',
			'seat': '',
			'action': ''
		},
	};
	// The table is not displayed in the lobby
	this.private_table = private_table;
	// The number of players who receive cards at the begining of each round
	this.players_sitting_in_count = 0;
	// The number of players that currently hold cards in their hands
	this.players_in_hand_count = 0;
	// Reference to the last player that will act in the current phase (originally the dealer, unless there are bets in the pot)
	this.last_player_to_act = null;
	// The game has begun
	this.game_is_on = false;
	// The game has only two players
	this.heads_up = false;
	// References to all the player objects in the table, indexed by seat number
	this.seats = [];
	// The deck of the table
	this.deck = deck;
	// The function that emits the events of the table
	this.event_emitter = event_emitter;
	// Initializing the empty seats
	for( var i=0 ; i<this.public.seats_count  ; i++ ) {
		this.seats[i] = null;
	}
}

// The function that emits the events of the table
Table.prototype.emit_event = function( event_name, event_data ){
	this.event_emitter( event_name, event_data );
	this.public.log = {
		'message': '',
		'seat': '',
		'action': ''
	};
}

Table.prototype.find_next_player = function( offset, status ) {
	offset = typeof offset !== 'undefined' ? offset : this.public.active_seat;
	status = typeof status !== 'undefined' ? status : 'in_hand';

	if( offset !== this.public.seats_count ) {
		for( var i=offset+1 ; i<this.public.seats_count ; i++ ) {
			if( this.seats[i] !== null && this.seats[i].public[status] ) {
				return i;
			}
		}
	}
	for( var i=0 ; i<=offset ; i++ ) {
		if( this.seats[i] !== null && this.seats[i].public[status] ) {
			return i;
		}
	}

	return null;
}

Table.prototype.find_previous_player = function( offset, status ) {
	offset = typeof offset !== 'undefined' ? offset : this.public.active_seat;
	status = typeof status !== 'undefined' ? status : 'in_hand';

	if( offset !== 0 ) {
		for( var i=offset-1 ; i>=0 ; i-- ) {
			if( this.seats[i] !== null && this.seats[i].public[status] ) {
				return i;
			}
		}
	}
	for( var i=this.public.seats_count-1 ; i>=offset ; i-- ) {
		if( this.seats[i] !== null && this.seats[i].public[status] ) {
			return i;
		}
	}

	return null;
}

/**
 * Method that starts a new game
 */
Table.prototype.initialize_round = function( change_dealer ) {
	change_dealer = typeof change_dealer == 'undefined' ? true : change_dealer ;

	if( this.players_sitting_in_count > 1 ) {
		// The game is on now
		this.game_is_on = true;
		this.public.board = ['', '', '', '', ''];
		this.deck.shuffle();
		this.heads_up = this.players_sitting_in_count === 2;
		this.players_in_hand_count = 0;

		for( var i=0 ; i<this.public.seats_count ; i++ ) {
			// If a player is sitting on the current seat
			if( this.seats[i] !== null && this.seats[i].public.sitting_in ) {
				this.players_in_hand_count++;
				this.seats[i].prepare_for_new_round();
			}
		}

		// Giving the dealer button to a random player
		if( this.public.dealer_seat === null ) {
			var random_dealer_seat = Math.ceil( Math.random() * this.players_sitting_in_count );
			var player_counter = 0;
			var i = -1;

			// Assinging the dealer button to the random player
			while( player_counter !== random_dealer_seat && i < this.public.seats_count ) {
				i++;
				if( this.seats[i] !== null && this.seats[i].public.sitting_in ) {
					player_counter++;
				}
			}
			this.public.dealer_seat = i;
		} else if( change_dealer ) {
			this.public.dealer_seat = this.find_next_player( this.public.dealer_seat );
		}

		this.initialize_small_blind();
	}
}

/**
 * Method that starts the "small blind" round
 */
Table.prototype.initialize_small_blind = function() {
	// Set the table phase to 'small_blind'
	this.public.phase = 'small_blind';

	// If it's a heads up match, the dealer posts the small blind
	if( this.heads_up ) {
		this.public.active_seat = this.public.dealer_seat;
	} else {
		this.public.active_seat = this.find_next_player( this.public.dealer_seat );
	}
	this.last_player_to_act = 10;

	// Start asking players to post the small blind
	this.seats[this.public.active_seat].socket.emit('post_small_blind');
	this.emit_event( 'table_data', this.public );
}

/**
 * Method that starts the "small blind" round
 */
Table.prototype.initialize_big_blind = function() {
	// Set the table phase to 'big_blind'
	this.public.phase = 'big_blind';
	this.action_to_next_player();
}

/**
 * Method that starts the "preflop" round
 */
Table.prototype.initialize_preflop = function() {
	// Set the table phase to 'preflop'
	this.public.phase = 'preflop';
	var current_player = this.public.active_seat;
	// The player that placed the big blind is the last player to act for the round
	this.last_player_to_act = this.public.active_seat;

	for( var i=0 ; i<this.players_in_hand_count ; i++ ) {
		this.seats[current_player].cards = this.deck.deal( 2 );
		this.seats[current_player].public.has_cards = true;
		this.seats[current_player].socket.emit( 'dealing_cards', this.seats[current_player].cards );
		current_player = this.find_next_player( current_player );
	}

	this.action_to_next_player();
}

/**
 * Method that starts the next phase of the round
 */
Table.prototype.initialize_next_phase = function() {
	switch( this.public.phase ) {
		case 'preflop':
			this.public.phase = 'flop';
			this.public.board = this.deck.deal( 3 ).concat( ['', ''] );
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

	this.add_bets_to_the_pot();
	this.public.biggest_bet = 0;
	this.public.active_seat = this.find_next_player( this.public.dealer_seat );
	this.last_player_to_act = this.find_previous_player( this.public.active_seat );
	this.emit_event( 'table_data', this.public );
	this.seats[this.public.active_seat].socket.emit('act_not_betted_pot');
}

/**
 * Making the next player the active one
 */
Table.prototype.action_to_next_player = function() {
	this.public.active_seat = this.find_next_player();

	switch( this.public.phase ) {
		case 'small_blind':
			this.seats[this.public.active_seat].socket.emit( 'post_small_blind' );
			break;
		case 'big_blind':
			this.seats[this.public.active_seat].socket.emit( 'post_big_blind' );
			break;
		case 'preflop':
			this.seats[this.public.active_seat].socket.emit( 'act_betted_pot' );
			break;
		case 'flop':
			// If someone has betted
			if( this.public.biggest_bet ) {
				this.seats[this.public.active_seat].socket.emit( 'act_betted_pot' );
			} else {
				this.seats[this.public.active_seat].socket.emit( 'act_not_betted_pot' );
			}
			break;
		case 'turn':
			if( this.public.biggest_bet ) {
				this.seats[this.public.active_seat].socket.emit( 'act_betted_pot' );
			} else {
				this.seats[this.public.active_seat].socket.emit( 'act_not_betted_pot' );
			}
			break;
		case 'river':
			if( this.public.biggest_bet ) {
				this.seats[this.public.active_seat].socket.emit( 'act_betted_pot' );
			} else {
				this.seats[this.public.active_seat].socket.emit( 'act_not_betted_pot' );
			}
			break;
	}

	this.emit_event( 'table_data', this.public );
}

/**
 * The phase when the players show their hands until a winner is found
 */
Table.prototype.showdown = function() {
	this.add_bets_to_the_pot();
	
	var current_player = this.find_next_player( this.public.dealer_seat );
	var winners = [];

	for( var i=0 ; i<this.players_in_hand_count ; i++ ) {
		this.seats[current_player].evaluate_hand( this.public.board );

		if( !winners.length || this.seats[current_player].evaluated_hand.rating > this.seats[winners[0]].evaluated_hand.rating ) {
			winners = [current_player];
			this.seats[current_player].public.cards = this.seats[current_player].cards;
		}
		else if( this.seats[current_player].evaluated_hand.rating == this.seats[winners[0]].evaluated_hand.rating ) {
			winners.push(current_player);
			this.seats[current_player].public.cards = this.seats[current_player].cards;
		}

		current_player = this.find_next_player( current_player );
	}

	if( winners.length == 1 ) {
		var html_hand = '[' + this.seats[winners[0]].evaluated_hand.cards.join(', ') + ']';
		html_hand = html_hand.replace(/s/g, '&#9824;').replace(/c/g, '&#9827;').replace(/h/g, '&#9829;').replace(/d/g, '&#9830;');
		this.public.log.message = this.seats[winners[0]].public.name + ' wins the pot with ' + this.seats[winners[0]].evaluated_hand.name + ' ' + html_hand;
		this.give_pot_to_winner( winners[0] );
	} 
	else if( winners.length == 2 ){
		this.public.log.message = this.seats[winners[0]].public.name + ' and ' + this.seats[winners[1]].public.name + ' split the pot with ' + this.seats[winners[0]].evaluated_hand.name;
	}
	else {
		var winners_length = winners.length;
		this.public.log.message = '';
		for( var i=0 ; i<winners_length-2 ; i++ ) {
			this.public.log.message = this.public.log.message + this.seats[winners[i]].public.name + ', ';
		}
		this.public.log.message = this.public.log.message + this.seats[winners[winners_length-2]].public.name + ' and ' + this.seats[winners[winners_length-1]].public.name + 'split the pot with ' + this.seats[winners[0]].evaluated_hand.name;
	}
	this.emit_event( 'table_data', this.public );

	var that = this;
	setTimeout( function(){
		that.end_round();
	}, 2000 );
}

/**
 * Ends the current phase of the round
 */
Table.prototype.end_phase = function() {
	switch( this.public.phase ) {
		case 'preflop':
		case 'flop':
		case 'turn':
			this.initialize_next_phase();
			break;
		case 'river':
			this.showdown();
			break;
	}
}

/**
 * When a player posts the small blind
 * @param int seat
 */
Table.prototype.player_posted_small_blind = function() {
	this.public.log.message = this.seats[this.public.active_seat].public.name + ' posted the small blind';
	this.public.biggest_bet = this.public.small_blind;
	this.emit_event( 'table_data', this.public );
	this.initialize_big_blind();
}

/**
 * When a player posts the big blind
 * @param int seat
 */
Table.prototype.player_posted_big_blind = function() {
	this.public.log.message = this.seats[this.public.active_seat].public.name + ' posted the big blind';
	this.public.biggest_bet = this.public.big_blind;
	this.emit_event( 'table_data', this.public );
	this.initialize_preflop();
}

/**
 * Adds all the bets to the pot
 */
Table.prototype.add_bets_to_the_pot = function() {
	// For each seat
	for( var i=0 ; i<this.public.seats_count ; i++ ) {
		// If a player has betted
		if( this.seats[i] !== null && this.seats[i].public.bet ) {
			// Add the bet to the pot
			this.public.pot += this.seats[i].public.bet;
			this.seats[i].public.bet = 0;
		}
	}
}

/**
 * Method that adds the chips that exists in the pot, to the winner's chips
 */
Table.prototype.give_pot_to_winner = function( winners_seat ) {
	this.seats[winners_seat].public.chips_in_play += this.public.pot;
	this.public.pot = 0;
}

/**
 * Checks if the round should continue after a player has folded
 */
Table.prototype.player_folded = function() {
	this.public.log.message = this.seats[this.public.active_seat].public.name + ' folded';
	this.emit_event( 'table_data', this.public );

	this.players_in_hand_count--;
	if( this.players_in_hand_count <= 1 ) {
		this.add_bets_to_the_pot();
		var winners_seat = this.find_next_player();
		this.give_pot_to_winner( winners_seat );
		this.end_round();
	} else {
		if( this.last_player_to_act == this.public.active_seat ) {
			this.end_phase();
		} else {
			this.action_to_next_player();
		}
	}
}

/**
 * When a player checks
 */
Table.prototype.player_checked = function() {
	this.public.log.message = this.seats[this.public.active_seat].public.name + ' checked';
	this.emit_event( 'table_data', this.public );

	if( this.last_player_to_act === this.public.active_seat ) {
		this.end_phase();
	} else {
		this.action_to_next_player();
	}
}

/**
 * When a player calls
 */
Table.prototype.player_called = function() {
	this.public.log.message = this.seats[this.public.active_seat].public.name + ' called';
	this.emit_event( 'table_data', this.public );

	if( this.last_player_to_act === this.public.active_seat ) {
		this.end_phase();
	} else {
		this.action_to_next_player();
	}
}

/**
 * When a player bets
 */
Table.prototype.player_betted = function() {
	this.public.biggest_bet = this.seats[this.public.active_seat].public.bet;
	this.public.log.message = this.seats[this.public.active_seat].public.name + ' betted';
	this.emit_event( 'table_data', this.public );

	this.last_player_to_act = this.find_previous_player();
	this.action_to_next_player();
}

/**
 * When a player raises
 */
Table.prototype.player_raised = function() {
	this.public.log.message = this.seats[this.public.active_seat].public.name + ' raised';
	this.emit_event( 'table_data', this.public );

	if( this.last_player_to_act === this.public.active_seat ) {
		this.end_phase();
	} else {
		this.action_to_next_player();
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
	this.public.players_seated_count++;
	
	this.player_sat_in( seat );
}

/**
 * Adds a player who is sitting on the table, to the game
 * @param int seat
 */
Table.prototype.player_sat_in = function( seat ) {
	this.public.log.message = this.seats[seat].public.name + ' sat in';
	this.emit_event( 'table_data', this.public );

	// The player is sitting in
	this.seats[seat].public.sitting_in = true;
	this.players_sitting_in_count++;
	
	this.emit_event( 'table_data', this.public );

	// If there are no players playing right now, try to initialize a game with the new player
	if( !this.game_is_on && this.players_sitting_in_count > 1 ) {
		// Initialize the game
		this.initialize_round( false );
	}
}

/**
 * Changes the data of the table when a player leaves
 * @param int seat
 */
Table.prototype.player_left = function( seat ) {
	this.public.log.message = this.seats[seat].public.name + ' left';

	// If someone is really sitting on that seat
	if( this.seats[seat].public.name ) {
		var next_action = '';

		// If the player is sitting in, make them sit out first
		if( this.seats[seat].public.sitting_in ) {
			this.player_sat_out( seat, true );
		}

		this.seats[seat].leave_table();
		// Empty the seat
		this.public.seats[seat] = {};
		this.public.players_seated_count--;

		// If there are not enough players to continue the game
		if( this.public.players_seated_count < 2 ) {
			this.public.dealer_seat = null;
		}

		this.seats[seat] = null;
		this.emit_event( 'table_data', this.public );

		// If a player left a heads-up match and there are people waiting to play, start a new round
		if( this.players_in_hand_count < 2 ) {
			this.end_round();
		}
		// Else if the player was the last to act in this phase, end the phase
		else if( this.last_player_to_act === seat && this.public.active_seat === seat ) {
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

	// If the player didn't leave, log the action as "player sat out"
	if( !player_left ) {
		this.public.log.message = this.seats[seat].public.name + ' sat out';
		this.emit_event( 'table_data', this.public );
	}

	// If the player had betted, add the bets to the pot
	if( this.seats[seat].public.bet ) {
		this.public.pot += +this.seats[seat].public.bet;
		this.seats[seat].public.bet = 0;
	}

	var next_action = '';
	this.players_sitting_in_count--;

	if( this.seats[seat].public.in_hand ) {
		this.seats[seat].sit_out();
		this.players_in_hand_count--;

		if( this.players_in_hand_count < 2 ) {
			if( !player_left ) {
				this.end_round();
			}
		} else {
			// If the player was not the last player to act but they were the player who should act in this round
			if( this.public.active_seat === seat && this.last_player_to_act !== seat ) {
				this.action_to_next_player();
			}
			// If the player was the last player to act and they left when they had to act
			else if( this.last_player_to_act === seat && this.public.active_seat === seat ) {
				if( !player_left ) {
					this.end_phase();
				}
			}
			// If the player was the last to act but not the player who should act
			else if ( this.last_player_to_act === seat ) {
				this.last_player_to_act = this.find_previous_player( this.last_player_to_act );
			}
		}
	} else {
		this.seats[seat].sit_out();
	}
	this.emit_event( 'table_data', this.public );
}

/**
 * Method that makes the doubly linked list of players
 */
Table.prototype.remove_all_cards_from_play = function() {
	// For each seat
	for( var i=0 ; i<this.public.seats_count ; i++ ) {
		// If a player is sitting on the current seat
		if( this.seats[i] !== null ) {
			this.seats[i].cards = [];
			this.seats[i].public.has_cards = false;
		}
	}
}

/**
 * Actions that should be taken when the round has ended
 */
Table.prototype.end_round = function() {
	// If there were any bets, they are added to the pot
	this.add_bets_to_the_pot();
	if( this.public.pot ) {
		var winners_seat = this.find_next_player( 0 );
		this.give_pot_to_winner( winners_seat );
	}

	for( i=0 ; i<this.public.seats_count ; i++ ) {
		if( this.seats[i] !== null && this.seats[i].public.chips_in_play <=0 && this.seats[i].public.sitting_in ) {
			this.seats[i].sit_out();
			this.players_sitting_in_count--;
		}
	}

	if( this.players_sitting_in_count < 2 ) {
		this.stop_game();
	} else {
		this.initialize_round();
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
	this.public.active_seat = null;
	this.last_player_to_act = null;
	this.remove_all_cards_from_play();
	this.game_is_on = false;
	this.emit_event( 'game_stopped', this.public );
}

module.exports = Table;