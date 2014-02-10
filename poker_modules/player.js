/**
 * The player "class"
 * @param string id (player's id, never changes)
 * @param object socket (the current socket of the player)
 * @param string name (the user's screen name)
 * @param int chips (the total amount of chip the user has)
 */
var Player = function( id, socket, name, chips ) {
	this.public = {
		// The name of the user
		name: name,
		// The chips that the player plays on the table
		chips_in_play: 0,
		// Flag that shows whether a player who is sitting on the table, wants to be dealt cards
		sitting_in: false,
		// Flag that shows if the player is playing in the current round
		in_hand: false
	};
	// The user id
	this.id = id;
	// The socket object of the user
	this.socket = socket;
	// The chips that are available in the user's account
	this.chips = chips;
	// Is set to false if the player is not sitting on any tables, otherwise it's set to the table id
	this.sitting_on_table = false;
	// The number of the seat of the table that the player is sitting
	this.seat = null;
	// Reference to the player who is sitting after the current player
	this.next_player = {};
	// Reference to the player who is sitting before the current player
	this.previous_player = {};
	// The cards that the player is holding
	this.cards = [];
}

/**
 * Disconnects the player from the doubly linked list
 */
Player.prototype.unlink = function() {
	if( this.next_player ) {
		this.next_player.previous_player = this.previous_player;
		this.previous_player.next_player = this.next_player;
	}
}

/**
 * Updates the player data when they leave the table
 */
Player.prototype.leave_table = function() {
	if( this.sitting_on_table ) {
		this.sit_out();
		// Remove the chips from play
		this.chips += this.public.chips_in_play;
		this.public.chips_in_play = 0;
		// Remove the player from the table
		this.sitting_on_table = false;
		this.seat = null;
	}
}

/**
 * Updates the player data when they sit out
 */
Player.prototype.sit_out = function() {
	if( this.sitting_on_table ) {
		this.public.sitting_in = false;
		this.public.in_hand = false;
		// Remove the player from the doubly linked list
		this.unlink();
	}
}

module.exports = Player;