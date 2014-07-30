var Player = require('../poker_modules/player.js');
var Table = require('../poker_modules/table.js');

var event_emitter = function( table_id ) {
	return function ( event_name, event_data ) {
	}
}

var socket = {
	emit: function() {
		return;
	}
};

function initialize_test_table() {
	var players = [],
		table;

		table = new Table( 0, 'Sample 10-handed Table', event_emitter(0), 10, 2, 1, 200, 40, false );

		for( var i=0 ; i<4 ; i++ ) {
			players[i] = new Player( socket, 'Player_'+i, 1000 );
			players[i].socket = socket;
			
		}

		table.player_sat_on_the_table( players[0], 2, 1000 );
		table.player_sat_on_the_table( players[1], 6, 1000 );
		table.player_sat_on_the_table( players[2], 4, 1000 );
		table.player_sat_on_the_table( players[3], 8, 1000 );

		return table;
}

describe("Posting the small blind", function() {

	var table;

 	beforeEach(function() {
		table = initialize_test_table();	
	});

	it("should make the next player active", function() {
		if( table.public.active_seat === 2 ) {
			table.player_posted_small_blind();
    		expect( table.public.active_seat ).toEqual( 6 );
		} else {
			table.player_posted_small_blind();
    		expect( table.public.active_seat ).toEqual( 2 );
		}
	});

	it("should not affect the players sitting out", function() {
		table.player_posted_small_blind();
		var current_player = table.public.active_seat;
		for( var i=0 ; i<table.players_seated_count ; i++ ) {
			table.find_next_player();
		}
    	expect( table.public.active_seat ).toEqual( current_player );
	});

	it("should proceed to the big blind phase", function() {
		table.player_posted_small_blind();
    	expect( table.public.phase ).toEqual( 'big_blind' );
	});
});