var Player = require('../poker_modules/player.js');
var Table = require('../poker_modules/table.js');


xdescribe("Reset bet after a new game", function() {

	var table,
		players = [],
		initialChips = 0;

 	beforeEach(function() {
 		jasmine.clock().install();

		var eventEmitter = function( tableId ) {
			return function ( eventName, eventData ) {};
		}

 		var socket = {
			emit: function() {
				return;
			}
		};

		//id, name, eventEmitter, seatsCount, bigBlind, smallBlind, maxBuyIn, minBuyIn, privateTable
		table = new Table( 0, 'Sample 10-handed Table', eventEmitter(0), 10, 2, 1, 200, 40, false );

		for( var i=0 ; i<2 ; i++ ) {
			players[i] = new Player( socket, 'Player_'+i, 1000 );
			players[i].socket = socket;
		}

		initialChips = 100;
		table.playerSatOnTheTable( players[0], 2, initialChips );
		table.playerSatOnTheTable( players[1], 6, initialChips );

		table.deck.cards[0] = 'Ah';
		table.deck.cards[1] = 'Kh';

		table.deck.cards[2] = 'Ad';
		table.deck.cards[3] = 'Kd';

		table.deck.cards[4] = 'As';
		table.deck.cards[5] = 'Ks';
		table.deck.cards[6] = '3c';
		table.deck.cards[7] = '5c';
		table.deck.cards[8] = '8c';

		table.playerPostedSmallBlind();
		table.playerPostedBigBlind();

		table.playerChecked();
		table.playerChecked();

		table.playerChecked();
		table.playerChecked();

		jasmine.clock().tick(2000);

		table.deck.cards[0] = 'Ah';
		table.deck.cards[1] = 'Kh';

		table.deck.cards[2] = 'Ad';
		table.deck.cards[3] = 'Kd';

		table.deck.cards[4] = 'As';
		table.deck.cards[5] = 'Ks';
		table.deck.cards[6] = '3c';
		table.deck.cards[7] = '5c';
		table.deck.cards[8] = '8c';
	});

	afterEach(function() {
		jasmine.clock().uninstall();
	});

	it("should reset biggestBet to 0 on a new round", function() {
		console.log(JSON.stringify(table, null ,3 ));
	});

});