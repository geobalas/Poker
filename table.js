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
	this.public = {};
	this.public.id = id;
	this.public.name = name;
	this.public.no_of_seats = no_of_seats;
	this.public.big_blind = big_blind;
	this.public.small_blind = small_blind;
	this.public.min_buy_in = min_buy_in;
	this.public.max_buy_in = max_buy_in;
	this.public.no_of_players_seated = 0;
	this.public.phase = null;
	this.public.pot = null;
	this.public.dealer_seat = null;
	this.public.active_seat = null;
	this.public.seats = [];
	this.dealer = {};
	this.player_to_act = {};
	this.last_player_to_act = {};
	this.game_is_on = false;
	this.heads_up = false;
	this.private_table = private_table;
	this.seats = [];
	this.players_in_hand = 0;
	this.no_of_players_sitting_in = 0;
	for( var i=0 ; i<this.public.no_of_seats ; i++ ) {
		this.seats[i] = {};
	}
}

// Method that updates the public data of each player sitting on the table
Table.prototype.update_public_player_data = function() {
	var player_data = [];
	for( var i=0 ; i<this.public.no_of_seats ; i++ ) {
		player_data[i] = {};
		if( this.seats[i].name ) {
			player_data[i].name = this.seats[i].name;
			player_data[i].chips = this.seats[i].chips_in_play;
			if( this.player_to_act.name ) {
				player_data[i].acting = this.player_to_act.id === this.seats[i].id;
			} else {
				player_data[i].acting = false;
			}
		}
	}
	this.public.seats = player_data;
}

// Method that makes the doubly linked list of players
Table.prototype.link_players = function() {
	if( this.no_of_players_seated < 2) {
		 return false;	
	}
	// The seat number of the first player of the link
	var first_player_seat = false;
	// An object that points to the current player that is being added to the list
	var current_player = {};
	// For each seat
	for( var i=0 ; i<=this.public.no_of_seats-1 ; i++ ) {
		// If a player is sitting on the current seat
		if( this.seats[i].name ) {
			// Keep the seat on which the first player is sitting, so that
			// they can be linked to the last player in the end
			if( first_player_seat === false) {
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

// Method that starts a new game
Table.prototype.initialize_game = function() {
	// The game is on now
	this.game_is_on = true;
	if( this.public.no_of_players_seated === 2 ) {
		this.heads_up = true;
	}
	// Creating the linked list of players
	this.link_players();
	// Giving the dealer button to a random player
	var random_dealer_seat = Math.floor( Math.random() * this.public.no_of_players_seated );
	var current_player = {};
	for( var i=0 ; i<=this.public.no_of_seats-1 ; i++ ) {
		if( this.seats[i].name ) {
			current_player = this.seats[i];
			for( var j=0 ; j<=random_dealer_seat ; j++ ) {
				current_player = current_player.next_player;
			}
			this.public.dealer_seat = current_player.seat;
			this.dealer = current_player;
		}
	}
}

// Method that starts the "small blind" round
Table.prototype.init_small_blind = function() {
	this.phase = 'small_blind';
	if( this.heads_up ) {
		this.player_to_act = this.seats[this.public.dealer_seat];
		this.last_player_to_act = this.seats[this.public.dealer_seat].next_player;
	} else {
		this.player_to_act = this.seats[this.public.dealer_seat].next_player;
		this.last_player_to_act = this.player_to_act.previous_player;
	}
	this.public.active_seat = this.player_to_act.seat;
}

module.exports = Table;