var Player = require('../poker_modules/player.js');
var Table = require('../poker_modules/table.js');

var eventEmitter = function( tableId ) {
	return function ( eventName, eventData ) {
	}
}

var socket = {
	emit: function() {
		return;
	}
};

function initializeTestTable() {
	var players = [],
		table;

		table = new Table( 0, 'Sample 10-handed Table', eventEmitter(0), 10, 2, 1, 200, 40, false );

		for( var i=0 ; i<4 ; i++ ) {
			players[i] = new Player( socket, 'Player_'+i, 1000 );
			players[i].socket = socket;
			
		}

		table.playerSatOnTheTable( players[0], 2, 1000 );
		table.playerSatOnTheTable( players[1], 6, 1000 );
		table.playerSatOnTheTable( players[2], 4, 1000 );
		table.playerSatOnTheTable( players[3], 8, 1000 );

		return table;
}

describe("Posting the small blind", function() {

	var table;

 	beforeEach(function() {
		table = initializeTestTable();	
	});

	it("should make the next player active", function() {
		if( table.public.activeSeat === 2 ) {
			table.playerPostedSmallBlind();
    		expect( table.public.activeSeat ).toEqual( 6 );
		} else {
			table.playerPostedSmallBlind();
    		expect( table.public.activeSeat ).toEqual( 2 );
		}
	});

	it("should not affect the players sitting out", function() {
		table.playerPostedSmallBlind();
		var currentPlayer = table.public.activeSeat;
		for( var i=0 ; i<table.playersSeatedCount ; i++ ) {
			table.findNextPlayer();
		}
    	expect( table.public.activeSeat ).toEqual( currentPlayer );
	});

	it("should proceed to the big blind phase", function() {
		table.playerPostedSmallBlind();
    	expect( table.public.phase ).toEqual( 'bigBlind' );
	});
});