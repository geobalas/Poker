/**
 * The table "class"
 * @param string id (the table id, never changes)
 * @param string name (the name of the table)
 * @param int no_of_seats (the total number of players that can play on the table)
 * @param int big_blind (the current big blind)
 * @param int small_blind (the current small_blind)
 * @param int max_buy_in (the maximum amount of chips that one can bring to the table)
 * @param int min_buy_in (the minimum amount of chips that one can bring to the table)
 * @param bool private_table (flag that shows whether the table will be shown in the lobby)
 */
var Table = function( id, name, no_of_seats, big_blind, small_blind, max_buy_in, min_buy_in, private_table ) {
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
		seats: []
	};
	// The phase of the game ('small_blind', 'big_blind', 'preflop'... etc)
	this.phase = null;
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
	// References to all the player objects in the table, indexed by seat number
	this.seats = [];
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
		}
	}
	// Linking the last player with the first player in order to form the "circle"
	current_player.next_player = this.seats[first_player_seat];
	this.seats[first_player_seat].previous_player = current_player;

	return true;
}

/**
 * Making the next player the active one
 */
Table.prototype.action_to_next_player = function() {
	this.player_to_act = this.player_to_act.next_player;
	this.public.active_seat = this.player_to_act.seat;
	switch( this.phase ) {
		case 'small_blind':
			this.player_to_act.socket.emit( 'post_small_blind' );
			break;
		case 'big_blind':
			this.player_to_act.socket.emit( 'post_big_blind' );
			break;
		case 'preflop':
			break;
	}
}

/**
 * Method that starts a new game
 */
Table.prototype.initialize_game = function() {
	if( this.public.no_of_players_sitting_in > 1 ) {
		// The game is on now
		this.game_is_on = true;
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
		this.heads_up = this.public.no_of_players_sitting_in === 2;
		// Creating the linked list of players
		this.link_players();

		if( typeof this.dealer.public == 'undefined' || !this.dealer.public.sitting_in ) {
			// Assinging the dealer button to the player sitting on the seat
			// right after the dealer who left or sat out
			var found_new_dealer = false;
			for( var i=this.public.dealer_seat ; i<=this.public.no_of_seats-1 ; i++ ) {
				if( typeof this.seats[i].public !== 'undefined' && this.seats[i].public.sitting_in ) {
					this.dealer = this.seats[i];
					found_new_dealer = true;
					break;
				}
			}
			if( !found_new_dealer ) {
				for( var i=0 ; i<this.public.dealer_seat ; i++ ) {
					if( typeof this.seats[i].public !== 'undefined' && this.seats[i].public.sitting_in ) {
						this.dealer = this.seats[i];
						break;
					}
				}
			}
		} else {
			this.dealer = this.dealer.next_player;
		}
		this.public.dealer_seat = this.dealer.seat;
		this.last_position = this.dealer;

		this.init_small_blind();
	}
}

/**
 * Method that starts the "small blind" round
 */
Table.prototype.init_small_blind = function() {
	// Set the table phase to 'small_blind'
	this.phase = 'small_blind';
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
	this.player_to_act.socket.emit( 'post_small_blind' );
}

/**
 * Method that starts the "small blind" round
 */
Table.prototype.init_big_blind = function() {
	// Set the table phase to 'big_blind'
	this.phase = 'big_blind';
}

/**
 * Method that starts the "preflop" round
 */
Table.prototype.init_preflop = function() {
	// Set the table phase to 'preflop'
	this.phase = 'preflop';
}

/**
 * Sets the public data of the player that will be sent along with the table data
 */
Table.prototype.player_sat_on_the_table = function( seat ) {
	this.public.seats[seat] = this.seats[seat].public;
}

/**
 * Changes the data of the table when a player leaves
 */
Table.prototype.player_left = function( seat ) {
	// If someone is really sitting on that seat
	if( this.seats[seat].id ) {
		// If the player is sitting in, make them sit out first
		if( this.seats[seat].public.sitting_in ) {
			this.player_sat_out( seat );
		}
		// Empty the seat
		this.seats[seat] = {};
		this.public.seats[seat] = {};
		this.public.no_of_players_seated--;
		if( this.public.no_of_players_seated < 2 ) {
			this.dealer = {};
			this.public.dealer_seat = null;
			this.last_position = {};
		}
	}
}

/**
 * Changes the data of the table when a player sits out
 */
Table.prototype.player_sat_out = function( seat ) {
	this.public.no_of_players_sitting_in--;
	if( this.public.no_of_players_sitting_in < 2 ) {
		this.seats[seat].sit_out();
		this.stop_game();
	} else{
		// If there were only two players but there are more players sitting in, waiting to play, start a new round
		if ( this.seats[seat].previous_player.id == this.seats[seat].next_player.id ) {
			this.seats[seat].sit_out();
			this.new_round();
		} else {
			// If the player was the last player to act in the rounds and the game will continue,
			// the last player to act will be the previous player
			if( this.last_position.id === this.seats[seat].id ) {
				this.last_position = this.last_position.previous_player;
			}
			if( this.public.dealer_seat === seat ) {
				this.dealer = {};
			}
			if( this.player_to_act.seat === seat ) {
				this.action_to_next_player();
			}
			this.seats[seat].sit_out();
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
	this.player_to_act = {};
	this.last_player_to_act = {};
	this.game_is_on = false;
}

module.exports = Table;