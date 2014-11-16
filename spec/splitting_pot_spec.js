var Player = require('../poker_modules/player.js');
var Table = require('../poker_modules/table.js');


describe("Splitting the pot between two players", function() {

	var table,
		players = [],
		initialChips = 0;

 	beforeEach(function() {
 		jasmine.Clock.useMock();

		var eventEmitter = function( tableId ) {
			return function ( eventName, eventData ) {};
		}

 		var socket = {
			emit: function() {
				return;
			}
		};

		table = new Table( 0, 'Sample 10-handed Table', eventEmitter(0), 10, 2, 1, 200, 40, false );

		for( var i=0 ; i<3 ; i++ ) {
			players[i] = new Player( socket, 'Player_'+i, 1000 );
			players[i].socket = socket;
			
		}

		initialChips = 200;
		table.playerSatOnTheTable( players[0], 2, initialChips );
		table.playerSatOnTheTable( players[1], 6, initialChips );
		table.playerSatOnTheTable( players[2], 4, initialChips );

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

		table.playerPostedSmallBlind();
		table.playerPostedBigBlind();
		table.playerCalled();
		table.playerChecked();
		table.playerChecked();
		table.playerChecked();
		table.playerChecked();
		table.playerChecked();
		table.playerChecked();
		table.playerChecked();

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

		table.playerPostedSmallBlind();
		table.playerPostedBigBlind();
		table.playerCalled();
		table.playerCalled();
		table.playerChecked();
		table.playerBetted( 33 );
		table.playerCalled();
		table.playerCalled();
		table.playerChecked();
		table.playerChecked();
		table.playerChecked();
		table.playerChecked();
		table.playerChecked();
	});

	it("should give an equal amount of chips back to the players, when there is no odd chip", function() {
		table.playerChecked();
		for( var i=0 ; i<3 ; i++ ) {
			expect( players[i].public.chipsInPlay ).toEqual( initialChips );
		}
	});

	it("should give an extra chip to the player on the left of the dealer seat, when there is an odd chip", function() {
		table.playerFolded();
		var playerOnDealersLeft = table.findNextPlayer( table.public.dealerSeat );
		var playerOnDealersRight = table.findPreviousPlayer( table.public.dealerSeat );
		console.log( playerOnDealersRight );
		for( var i=0 ; i<2 ; i++ ) {
			expect( table.seats[playerOnDealersLeft].public.chipsInPlay ).toEqual( table.seats[playerOnDealersRight].public.chipsInPlay+1 );
		}
	});
});