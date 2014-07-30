var Player = require('../poker_modules/player.js');
var Table = require('../poker_modules/table.js');


describe("Splitting the pot between two players", function() {

	var table,
		players = [],
		initial_chips = 0;

 	beforeEach(function() {
 		jasmine.Clock.useMock();

		var event_emitter = function( table_id ) {
			return function ( event_name, event_data ) {};
		}

 		var socket = {
			emit: function() {
				return;
			}
		};

		table = new Table( 0, 'Sample 10-handed Table', event_emitter(0), 10, 2, 1, 200, 40, false );

		for( var i=0 ; i<3 ; i++ ) {
			players[i] = new Player( socket, 'Player_'+i, 1000 );
			players[i].socket = socket;
			
		}

		initial_chips = 200;
		table.player_sat_on_the_table( players[0], 2, initial_chips );
		table.player_sat_on_the_table( players[1], 6, initial_chips );
		table.player_sat_on_the_table( players[2], 4, initial_chips );

		table.deck.cards[0] = 'Ah';
		table.deck.cards[1] = 'Kh';

		table.deck.cards[2] = 'Ad';
		table.deck.cards[3] = 'Kd';

		table.deck.cards[4] = 'As';
		table.deck.cards[5] = 'Ks';

		table.deck.cards[6] = '3c';
		table.deck.cards[7] = '5c';
		table.deck.cards[8] = '8c';
		table.deck.cards[9] = 'Js';
		table.deck.cards[10] = 'Qd';

		table.player_posted_small_blind();
		table.player_posted_big_blind();
		table.player_called();
		table.player_checked();
		table.player_checked();
		table.player_checked();
		table.player_checked();
		table.player_checked();
		table.player_checked();
		table.player_checked();

		jasmine.Clock.tick(2000);

		table.deck.cards[0] = 'Ah';
		table.deck.cards[1] = 'Kh';

		table.deck.cards[2] = 'Ad';
		table.deck.cards[3] = 'Kd';

		table.deck.cards[4] = 'As';
		table.deck.cards[5] = 'Ks';

		table.deck.cards[6] = '3c';
		table.deck.cards[7] = '5c';
		table.deck.cards[8] = '8c';
		table.deck.cards[9] = 'Js';
		table.deck.cards[10] = 'Qd';

		table.player_posted_small_blind();
		table.player_posted_big_blind();
		table.player_called();
		table.player_called();
		table.player_checked();
		table.player_betted( 33 );
		table.player_called();
		table.player_called();
		table.player_checked();
		table.player_checked();
		table.player_checked();
		table.player_checked();
		table.player_checked();
	});

	it("should give an equal amount of chips back to the players, when there is no odd chip", function() {
		table.player_checked();
		for( var i=0 ; i<3 ; i++ ) {
			expect( players[i].public.chips_in_play ).toEqual( initial_chips );
		}
	});

	it("should give an extra chip to the player on the left of the dealer seat, when there is an odd chip", function() {
		table.player_folded();
		var player_on_dealers_left = table.find_next_player( table.public.dealer_seat );
		var player_on_dealers_right = table.find_previous_player( table.public.dealer_seat );
		console.log( player_on_dealers_right );
		for( var i=0 ; i<2 ; i++ ) {
			expect( table.seats[player_on_dealers_left].public.chips_in_play ).toEqual( table.seats[player_on_dealers_right].public.chips_in_play+1 );
		}
	});
});