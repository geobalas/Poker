var Deck = require('./deck'),
	Pot = require('./pot');

/**
 * The table "class"
 * @param string	id (the table id)
 * @param string	name (the name of the table)
 * @param object 	deck (the deck object that the table will use)
 * @param function 	eventEmitter (function that emits the events to the players of the room)
 * @param int 		seatsCount (the total number of players that can play on the table)
 * @param int 		bigBlind (the current big blind)
 * @param int 		smallBlind (the current smallBlind)
 * @param int 		maxBuyIn (the maximum amount of chips that one can bring to the table)
 * @param int 		minBuyIn (the minimum amount of chips that one can bring to the table)
 * @param bool 		privateTable (flag that shows whether the table will be shown in the lobby)
 */
var Table = function( id, name, eventEmitter, seatsCount, bigBlind, smallBlind, maxBuyIn, minBuyIn, privateTable ) {
	// The table is not displayed in the lobby
	this.privateTable = privateTable;
	// The number of players who receive cards at the begining of each round
	this.playersSittingInCount = 0;
	// The number of players that currently hold cards in their hands
	this.playersInHandCount = 0;
	// Reference to the last player that will act in the current phase (originally the dealer, unless there are bets in the pot)
	this.lastPlayerToAct = null;
	// The game has begun
	this.gameIsOn = false;
	// The game has only two players
	this.headsUp = false;
	// References to all the player objects in the table, indexed by seat number
	this.seats = [];
	// The deck of the table
	this.deck = new Deck;
	// The function that emits the events of the table
	this.eventEmitter = eventEmitter;
	// The pot with its methods
	this.pot = new Pot;
	// All the public table data
	this.public = {
		// The table id
		id: id,
		// The table name
		name: name,
		// The number of the seats of the table
		seatsCount: seatsCount,
		// The number of players that are currently seated
		playersSeatedCount: 0,
		// The big blind amount
		bigBlind: bigBlind,
		// The small blind amount
		smallBlind: smallBlind,
		// The minimum allowed buy in
		minBuyIn: minBuyIn,
		// The maximum allowed buy in
		maxBuyIn: maxBuyIn,
		// The amount of chips that are in the pot
		pot: this.pot.pots,
		// The biggest bet of the table in the current phase
		biggestBet: 0,
		// The seat of the dealer
		dealerSeat: null,
		// The seat of the active player
		activeSeat: null,
		// The public data of the players, indexed by their seats
		seats: [],
		// The phase of the game ('smallBlind', 'bigBlind', 'preflop'... etc)
		phase: null,
		// The cards on the board
		board: ['', '', '', '', ''],
		// Log of an action, displayed in the chat
		log: {
			message: '',
			seat: '',
			action: ''
		},
	};
	// Initializing the empty seats
	for( var i=0 ; i<this.public.seatsCount ; i++ ) {
		this.seats[i] = null;
	}
};

// The function that emits the events of the table
Table.prototype.emitEvent = function( eventName, eventData ){
	this.eventEmitter( eventName, eventData );
	this.log({
		message: '',
		action: '',
		seat: '',
		notification: ''
	});
};

/**
 * Finds the next player of a certain status on the table
 * @param  number offset (the seat where search begins)
 * @param  string|array status (the status of the player who should be found)
 * @return number|null
 */
Table.prototype.findNextPlayer = function( offset, status ) {
	offset = typeof offset !== 'undefined' ? offset : this.public.activeSeat;
	status = typeof status !== 'undefined' ? status : 'inHand';

	if( status instanceof Array ) {
		var statusLength = status.length;
		if( offset !== this.public.seatsCount ) {
			for( var i=offset+1 ; i<this.public.seatsCount ; i++ ) {
				if( this.seats[i] !== null ) {
					var validStatus = true;
					for( var j=0 ; j<statusLength ; j++ ) {
						validStatus &= !!this.seats[i].public[status[j]];
					}
					if( validStatus ) {
						return i;
					}
				}
			}
		}
		for( var i=0 ; i<=offset ; i++ ) {
			if( this.seats[i] !== null ) {
				var validStatus = true;
				for( var j=0 ; j<statusLength ; j++ ) {
					validStatus &= !!this.seats[i].public[status[j]];
				}
				if( validStatus ) {
					return i;
				}
			}
		}
	} else {
		if( offset !== this.public.seatsCount ) {
			for( var i=offset+1 ; i<this.public.seatsCount ; i++ ) {
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
	}

	return null;
};

/**
 * Finds the previous player of a certain status on the table
 * @param  number offset (the seat where search begins)
 * @param  string|array status (the status of the player who should be found)
 * @return number|null
 */
Table.prototype.findPreviousPlayer = function( offset, status ) {
	offset = typeof offset !== 'undefined' ? offset : this.public.activeSeat;
	status = typeof status !== 'undefined' ? status : 'inHand';

	if( status instanceof Array ) {
		var statusLength = status.length;
		if( offset !== 0 ) {
			for( var i=offset-1 ; i>=0 ; i-- ) {
				if( this.seats[i] !== null ) {
					var validStatus = true;
					for( var j=0 ; j<statusLength ; j++ ) {
						validStatus &= !!this.seats[i].public[status[j]];
					}
					if( validStatus ) {
						return i;
					}
				}
			}
		}
		for( var i=this.public.seatsCount-1 ; i>=offset ; i-- ) {
			if( this.seats[i] !== null ) {
				var validStatus = true;
				for( var j=0 ; j<statusLength ; j++ ) {
					validStatus &= !!this.seats[i].public[status[j]];
				}
				if( validStatus ) {
					return i;
				}
			}
		}
	} else {
		if( offset !== 0 ) {
			for( var i=offset-1 ; i>=0 ; i-- ) {
				if( this.seats[i] !== null && this.seats[i].public[status] ) {
					return i;
				}
			}
		}
		for( var i=this.public.seatsCount-1 ; i>=offset ; i-- ) {
			if( this.seats[i] !== null && this.seats[i].public[status] ) {
				return i;
			}
		}
	}

	return null;
};

/**
 * Method that starts a new game
 */
Table.prototype.initializeRound = function( changeDealer ) {
	changeDealer = typeof changeDealer == 'undefined' ? true : changeDealer ;

	if( this.playersSittingInCount > 1 ) {
		// The game is on now
		this.gameIsOn = true;
		this.public.board = ['', '', '', '', ''];
		this.deck.shuffle();
		this.headsUp = this.playersSittingInCount === 2;
		this.playersInHandCount = 0;

		for( var i=0 ; i<this.public.seatsCount ; i++ ) {
			// If a player is sitting on the current seat
			if( this.seats[i] !== null && this.seats[i].public.sittingIn ) {
				if( !this.seats[i].public.chipsInPlay ) {
					this.seats[seat].sitOut();
					this.playersSittingInCount--;
				} else {
					this.playersInHandCount++;
					this.seats[i].prepareForNewRound();
				}
			}
		}

		// Giving the dealer button to a random player
		if( this.public.dealerSeat === null ) {
			var randomDealerSeat = Math.ceil( Math.random() * this.playersSittingInCount );
			var playerCounter = 0;
			var i = -1;

			// Assinging the dealer button to the random player
			while( playerCounter !== randomDealerSeat && i < this.public.seatsCount ) {
				i++;
				if( this.seats[i] !== null && this.seats[i].public.sittingIn ) {
					playerCounter++;
				}
			}
			this.public.dealerSeat = i;
		} else if( changeDealer || this.seats[this.public.dealerSeat].public.sittingIn === false ) {
			// If the dealer should be changed because the game will start with a new player
			// or if the old dealer is sitting out, give the dealer button to the next player
			this.public.dealerSeat = this.findNextPlayer( this.public.dealerSeat );
		}

		this.initializeSmallBlind();
	}
};

/**
 * Method that starts the "small blind" round
 */
Table.prototype.initializeSmallBlind = function() {
	// Set the table phase to 'smallBlind'
	this.public.phase = 'smallBlind';

	// If it's a heads up match, the dealer posts the small blind
	if( this.headsUp ) {
		this.public.activeSeat = this.public.dealerSeat;
	} else {
		this.public.activeSeat = this.findNextPlayer( this.public.dealerSeat );
	}
	this.lastPlayerToAct = 10;

	// Start asking players to post the small blind
	this.seats[this.public.activeSeat].socket.emit('postSmallBlind');
	this.emitEvent( 'table-data', this.public );
};

/**
 * Method that starts the "small blind" round
 */
Table.prototype.initializeBigBlind = function() {
	// Set the table phase to 'bigBlind'
	this.public.phase = 'bigBlind';
	this.actionToNextPlayer();
};

/**
 * Method that starts the "preflop" round
 */
Table.prototype.initializePreflop = function() {
	// Set the table phase to 'preflop'
	this.public.phase = 'preflop';
	var currentPlayer = this.public.activeSeat;
	// The player that placed the big blind is the last player to act for the round
	this.lastPlayerToAct = this.public.activeSeat;

	for( var i=0 ; i<this.playersInHandCount ; i++ ) {
		this.seats[currentPlayer].cards = this.deck.deal( 2 );
		this.seats[currentPlayer].public.hasCards = true;
		this.seats[currentPlayer].socket.emit( 'dealingCards', this.seats[currentPlayer].cards );
		currentPlayer = this.findNextPlayer( currentPlayer );
	}

	this.actionToNextPlayer();
};

/**
 * Method that starts the next phase of the round
 */
Table.prototype.initializeNextPhase = function() {
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

	this.pot.addTableBets( this.seats );
	this.public.biggestBet = 0;
	this.public.activeSeat = this.findNextPlayer( this.public.dealerSeat );
	this.lastPlayerToAct = this.findPreviousPlayer( this.public.activeSeat );
	this.emitEvent( 'table-data', this.public );

	// If all other players are all in, there should be no actions. Move to the next round.
	if( this.otherPlayersAreAllIn() ) {
		var that = this;
		setTimeout( function(){
			that.endPhase();
		}, 1000 );
	} else {
		this.seats[this.public.activeSeat].socket.emit('actNotBettedPot');
	}
};

/**
 * Making the next player the active one
 */
Table.prototype.actionToNextPlayer = function() {
	this.public.activeSeat = this.findNextPlayer( this.public.activeSeat, ['chipsInPlay', 'inHand'] );

	switch( this.public.phase ) {
		case 'smallBlind':
			this.seats[this.public.activeSeat].socket.emit( 'postSmallBlind' );
			break;
		case 'bigBlind':
			this.seats[this.public.activeSeat].socket.emit( 'postBigBlind' );
			break;
		case 'preflop':
			if( this.otherPlayersAreAllIn() ) {
				this.seats[this.public.activeSeat].socket.emit( 'actOthersAllIn' );
			} else {
				this.seats[this.public.activeSeat].socket.emit( 'actBettedPot' );
			}
			break;
		case 'flop':
		case 'turn':
		case 'river':
			// If someone has betted
			if( this.public.biggestBet ) {
				if( this.otherPlayersAreAllIn() ) {
					this.seats[this.public.activeSeat].socket.emit( 'actOthersAllIn' );
				} else {
					this.seats[this.public.activeSeat].socket.emit( 'actBettedPot' );
				}
			} else {
				this.seats[this.public.activeSeat].socket.emit( 'actNotBettedPot' );
			}
			break;
	}

	this.emitEvent( 'table-data', this.public );
};

/**
 * The phase when the players show their hands until a winner is found
 */
Table.prototype.showdown = function() {
	this.pot.addTableBets( this.seats );

	var currentPlayer = this.findNextPlayer( this.public.dealerSeat );
	var bestHandRating = 0;

	for( var i=0 ; i<this.playersInHandCount ; i++ ) {
		this.seats[currentPlayer].evaluateHand( this.public.board );
		// If the hand of the current player is the best one yet,
		// he has to show it to the others in order to prove it
		if( this.seats[currentPlayer].evaluatedHand.rating > bestHandRating ) {
			this.seats[currentPlayer].public.cards = this.seats[currentPlayer].cards;
		}
		currentPlayer = this.findNextPlayer( currentPlayer );
	}
	
	var messages = this.pot.destributeToWinners( this.seats, currentPlayer );

	var messagesCount = messages.length;
	for( var i=0 ; i<messagesCount ; i++ ) {
		this.log({
			message: messages[i],
			action: '',
			seat: '',
			notification: ''
		});
		this.emitEvent( 'table-data', this.public );
	}

	var that = this;
	setTimeout( function(){
		that.endRound();
	}, 2000 );
};

/**
 * Ends the current phase of the round
 */
Table.prototype.endPhase = function() {
	switch( this.public.phase ) {
		case 'preflop':
		case 'flop':
		case 'turn':
			this.initializeNextPhase();
			break;
		case 'river':
			this.showdown();
			break;
	}
};

/**
 * When a player posts the small blind
 * @param int seat
 */
Table.prototype.playerPostedSmallBlind = function() {
	var bet = this.seats[this.public.activeSeat].public.chipsInPlay >= this.public.smallBlind ? this.public.smallBlind : this.seats[this.public.activeSeat].public.chipsInPlay;
	this.seats[this.public.activeSeat].bet( bet );
	this.log({
		message: this.seats[this.public.activeSeat].public.name + ' posted the small blind',
		action: 'bet',
		seat: this.public.activeSeat,
		notification: 'Posted blind'
	});
	this.public.biggestBet = this.public.biggestBet < bet ? bet : this.public.biggestBet;
	this.emitEvent( 'table-data', this.public );
	this.initializeBigBlind();
};

/**
 * When a player posts the big blind
 * @param int seat
 */
Table.prototype.playerPostedBigBlind = function() {
	var bet = this.seats[this.public.activeSeat].public.chipsInPlay >= this.public.bigBlind ? this.public.bigBlind : this.seats[this.public.activeSeat].public.chipsInPlay;
	this.seats[this.public.activeSeat].bet( bet );
	this.log({
		message: this.seats[this.public.activeSeat].public.name + ' posted the big blind',
		action: 'bet',
		seat: this.public.activeSeat,
		notification: 'Posted blind'
	});
	this.public.biggestBet = this.public.biggestBet < bet ? bet : this.public.biggestBet;
	this.emitEvent( 'table-data', this.public );
	this.initializePreflop();
};

/**
 * Checks if the round should continue after a player has folded
 */
Table.prototype.playerFolded = function() {
	this.seats[this.public.activeSeat].fold();
	this.log({
		message: this.seats[this.public.activeSeat].public.name + ' folded',
		action: 'fold',
		seat: this.public.activeSeat,
		notification: 'Fold'
	});
	this.emitEvent( 'table-data', this.public );

	this.playersInHandCount--;
	this.pot.removePlayer( this.public.activeSeat );
	if( this.playersInHandCount <= 1 ) {
		this.pot.addTableBets( this.seats );
		var winnersSeat = this.findNextPlayer();
		this.pot.giveToWinner( this.seats[winnersSeat] );
		this.endRound();
	} else {
		if( this.lastPlayerToAct == this.public.activeSeat ) {
			this.endPhase();
		} else {
			this.actionToNextPlayer();
		}
	}
};

/**
 * When a player checks
 */
Table.prototype.playerChecked = function() {
	this.log({
		message: this.seats[this.public.activeSeat].public.name + ' checked',
		action: 'check',
		seat: this.public.activeSeat,
		notification: 'Check'
	});

	this.emitEvent( 'table-data', this.public );

	if( this.lastPlayerToAct === this.public.activeSeat ) {
		this.endPhase();
	} else {
		this.actionToNextPlayer();
	}
};

/**
 * When a player calls
 */
Table.prototype.playerCalled = function() {
	var calledAmount = this.public.biggestBet - this.seats[this.public.activeSeat].public.bet;
	this.seats[this.public.activeSeat].bet( calledAmount );

	this.log({
		message: this.seats[this.public.activeSeat].public.name + ' called',
		action: 'call',
		seat: this.public.activeSeat,
		notification: 'Call'
	});

	this.emitEvent( 'table-data', this.public );

	if( this.lastPlayerToAct === this.public.activeSeat || this.otherPlayersAreAllIn() ) {
		this.endPhase();
	} else {
		this.actionToNextPlayer();
	}
};

/**
 * When a player bets
 */
Table.prototype.playerBetted = function( amount ) {
	this.seats[this.public.activeSeat].bet( amount );
	this.public.biggestBet = this.public.biggestBet < this.seats[this.public.activeSeat].public.bet ? this.seats[this.public.activeSeat].public.bet : this.public.biggestBet;

	this.log({
		message: this.seats[this.public.activeSeat].public.name + ' betted ' + amount,
		action: 'bet',
		seat: this.public.activeSeat,
		notification: 'Bet ' + amount
	});

	this.emitEvent( 'table-data', this.public );

	var previousPlayerSeat = this.findPreviousPlayer();
	if( previousPlayerSeat === this.public.activeSeat ) {
		this.endPhase();
	} else {
		this.lastPlayerToAct = previousPlayerSeat;
		this.actionToNextPlayer();
	}
};

/**
 * When a player raises
 */
Table.prototype.playerRaised = function( amount ) {
	this.seats[this.public.activeSeat].raise( amount );
	var oldBiggestBet = this.public.biggestBet;
	this.public.biggestBet = this.public.biggestBet < this.seats[this.public.activeSeat].public.bet ? this.seats[this.public.activeSeat].public.bet : this.public.biggestBet;
	var raiseAmount = this.public.biggestBet - oldBiggestBet;
	this.log({
		message: this.seats[this.public.activeSeat].public.name + ' raised to ' + this.public.biggestBet,
		action: 'raise',
		seat: this.public.activeSeat,
		notification: 'Raise ' + raiseAmount
	});
	this.emitEvent( 'table-data', this.public );

	var previousPlayerSeat = this.findPreviousPlayer();
	if( previousPlayerSeat === this.public.activeSeat ) {
		this.endPhase();
	} else {
		this.lastPlayerToAct = previousPlayerSeat;
		this.actionToNextPlayer();
	}
};

/**
 * Adds the player to the table
 * @param object 	player
 * @param int 		seat
 */
Table.prototype.playerSatOnTheTable = function( player, seat, chips ) {
	this.seats[seat] = player;
	this.public.seats[seat] = player.public;

	this.seats[seat].sitOnTable( this.public.id, seat, chips );

	// Increase the counters of the table
	this.public.playersSeatedCount++;
	
	this.playerSatIn( seat );
};

/**
 * Adds a player who is sitting on the table, to the game
 * @param int seat
 */
Table.prototype.playerSatIn = function( seat ) {
	this.log({
		message: this.seats[seat].public.name + ' sat in',
		action: '',
		seat: '',
		notification: ''
	});
	this.emitEvent( 'table-data', this.public );

	// The player is sitting in
	this.seats[seat].public.sittingIn = true;
	this.playersSittingInCount++;
	
	this.emitEvent( 'table-data', this.public );

	// If there are no players playing right now, try to initialize a game with the new player
	if( !this.gameIsOn && this.playersSittingInCount > 1 ) {
		// Initialize the game
		this.initializeRound( false );
	}
};

/**
 * Changes the data of the table when a player leaves
 * @param int seat
 */
Table.prototype.playerLeft = function( seat ) {
	this.log({
		message: this.seats[seat].public.name + ' left',
		action: '',
		seat: '',
		notification: ''
	});

	// If someone is really sitting on that seat
	if( this.seats[seat].public.name ) {
		var nextAction = '';

		// If the player is sitting in, make them sit out first
		if( this.seats[seat].public.sittingIn ) {
			this.playerSatOut( seat, true );
		}

		this.seats[seat].leaveTable();

		// Empty the seat
		this.public.seats[seat] = {};
		this.public.playersSeatedCount--;

		// If there are not enough players to continue the game
		if( this.public.playersSeatedCount < 2 ) {
			this.public.dealerSeat = null;
		}

		this.seats[seat] = null;
		this.emitEvent( 'table-data', this.public );

		// If a player left a heads-up match and there are people waiting to play, start a new round
		if( this.playersInHandCount < 2 ) {
			this.endRound();
		}
		// Else if the player was the last to act in this phase, end the phase
		else if( this.lastPlayerToAct === seat && this.public.activeSeat === seat ) {
			this.endPhase();
		}
	}
};

/**
 * Changes the data of the table when a player sits out
 * @param int 	seat 			(the numeber of the seat)
 * @param bool 	playerLeft		(flag that shows that the player actually left the table)
 */
Table.prototype.playerSatOut = function( seat, playerLeft ) {
	// Set the playerLeft parameter to false if it's not specified
	if( typeof playerLeft == 'undefined' ) {
		playerLeft = false;
	}

	// If the player didn't leave, log the action as "player sat out"
	if( !playerLeft ) {
		this.log({
			message: this.seats[seat].public.name + ' sat out',
			action: '',
			seat: '',
			notification: ''
		});
		this.emitEvent( 'table-data', this.public );
	}

	// If the player had betted, add the bets to the pot
	if( this.seats[seat].public.bet ) {
		this.pot.addPlayersBets( this.seats[seat] );
	}
	this.pot.removePlayer( this.public.activeSeat );

	var nextAction = '';
	this.playersSittingInCount--;

	if( this.seats[seat].public.inHand ) {
		this.seats[seat].sitOut();
		this.playersInHandCount--;

		if( this.playersInHandCount < 2 ) {
			if( !playerLeft ) {
				this.endRound();
			}
		} else {
			// If the player was not the last player to act but they were the player who should act in this round
			if( this.public.activeSeat === seat && this.lastPlayerToAct !== seat ) {
				this.actionToNextPlayer();
			}
			// If the player was the last player to act and they left when they had to act
			else if( this.lastPlayerToAct === seat && this.public.activeSeat === seat ) {
				if( !playerLeft ) {
					this.endPhase();
				}
			}
			// If the player was the last to act but not the player who should act
			else if ( this.lastPlayerToAct === seat ) {
				this.lastPlayerToAct = this.findPreviousPlayer( this.lastPlayerToAct );
			}
		}
	} else {
		this.seats[seat].sitOut();
	}
	this.emitEvent( 'table-data', this.public );
};

Table.prototype.otherPlayersAreAllIn = function() {
	// Check if the players are all in
	var currentPlayer = this.public.activeSeat;
	var playersAllIn = 0;
	for( var i=0 ; i<this.playersInHandCount ; i++ ) {
		if( this.seats[currentPlayer].public.chipsInPlay === 0 ) {
			playersAllIn++;
		}
		currentPlayer = this.findNextPlayer( currentPlayer );
	}

	// In this case, all the players are all in. There should be no actions. Move to the next round.
	return playersAllIn >= this.playersInHandCount-1;
};

/**
 * Method that makes the doubly linked list of players
 */
Table.prototype.removeAllCardsFromPlay = function() {
	// For each seat
	for( var i=0 ; i<this.public.seatsCount ; i++ ) {
		// If a player is sitting on the current seat
		if( this.seats[i] !== null ) {
			this.seats[i].cards = [];
			this.seats[i].public.hasCards = false;
		}
	}
};

/**
 * Actions that should be taken when the round has ended
 */
Table.prototype.endRound = function() {
	// If there were any bets, they are added to the pot
	this.pot.addTableBets( this.seats );
	if( !this.pot.isEmpty() ) {
		var winnersSeat = this.findNextPlayer( 0 );
		this.pot.giveToWinner( this.seats[winnersSeat] );
	}

	// Sitting out the players who don't have chips
	for( i=0 ; i<this.public.seatsCount ; i++ ) {
		if( this.seats[i] !== null && this.seats[i].public.chipsInPlay <=0 && this.seats[i].public.sittingIn ) {
			this.seats[i].sitOut();
			this.playersSittingInCount--;
		}
	}

	// If there are not enough players to continue the game, stop it
	if( this.playersSittingInCount < 2 ) {
		this.stopGame();
	} else {
		this.initializeRound();
	}
};

/**
 * Method that stops the game
 */
Table.prototype.stopGame = function() {
	this.public.phase = null;
	this.pot.reset();
	this.public.activeSeat = null;
	this.public.board = ['', '', '', '', ''];
	this.public.activeSeat = null;
	this.lastPlayerToAct = null;
	this.removeAllCardsFromPlay();
	this.gameIsOn = false;
	this.emitEvent( 'gameStopped', this.public );
};

/**
 * Logs the last event
 */
Table.prototype.log = function(log) {
	this.public.log = null;
	this.public.log = log;
}

module.exports = Table;