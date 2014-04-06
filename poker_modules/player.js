/**
 * The player "class"
 * @param string id (player's id, never changes)
 * @param object socket (the current socket of the player)
 * @param string name (the user's screen name)
 * @param int chips (the total amount of chip the user has)
 */
var Player = function( socket, name, chips ) {
	this.public = {
		// The name of the user
		name: name,
		// The chips that the player plays on the table
		chips_in_play: 0,
		// Flag that shows whether a player who is sitting on the table, wants to be dealt cards
		sitting_in: false,
		// Flag that shows if the player is playing in the current round
		in_hand: false,
		// Flag that shows if the player is holding cards
		has_cards: false,
        // The cards the player is holding, made public at the showdown
        cards: []
	};
	// The socket object of the user
	this.socket = socket;
	// The chips that are available in the user's account
	this.chips = chips;
	// The room that send the table events to the player
	this.room = null;
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
	// The hand that the player has in the current poker round and its rating
	this.evaluated_hand = {};
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

/**
 * Updates the player data when they sit out
 */
Player.prototype.fold = function() {
	// Remove the player from the doubly linked list
	this.unlink();
	// The player has no cards now
	this.cards = [];
	this.public.has_cards = false;
}

/**
 * Resets the player's round data
 */
Player.prototype.prepare_for_new_round = function() {
    this.cards = [];
    this.public.cards = [];
    this.public.has_cards = false;
    this.evaluated_hand = {};
}

/**
 * Returns the player's hand and its rating
 * @param array board (the cards that are on the board in the current round)
 * @return object this (for chaining)
 */
Player.prototype.evaluate_hand = function( board ) {
	var cards = this.cards.concat( board );
	var card_values = [ '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A' ];
    var card_names = { 'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack', 'T': 'ten', '9': 'nine', '8': 'eight', '7': 'seven', '6': 'six', '5': 'five', '4': 'four', '3': 'three', '2': 'deuce' }

    // Returns the name of the card, in singular or in plural
    var get_card_name = function( card_value, plural ) {
        if( typeof plural !== 'undefined' && plural == true ) {
            return card_value == '6' ? card_names[card_value] + 'es' : card_names[card_value] + 's';
        } else {
            return card_names[card_value];
        }
    }

    // Swaps the position of the cards of the first one is smaller than the second one
    var swap = function( index1, index2 ) {
        if ( card_values.indexOf( cards[index1][0] ) < card_values.indexOf( cards[index2][0] )){
            var tmp = cards[index1];
            cards[index1] = cards[index2];
            cards[index2] = tmp;
        }
    };
	
	var rate_hand = function( hand ) {
		return card_values.indexOf( hand[0][0] ) * 30941 + card_values.indexOf( hand[1][0] ) * 2380 + card_values.indexOf( hand[2][0] ) * 183 + card_values.indexOf( hand[3][0] ) * 14 + card_values.indexOf( hand[4][0] );
	}
    
    // Sorting the 7 cards
    cards.sort( function( a, b ) {
        return card_values.indexOf( b[0] ) - card_values.indexOf( a[0] );
    });

    var straight = [],
        flushes = {},
        pairs = {};
        flushes['s'] = [],
        flushes['h'] = [],
        flushes['d'] = [],
        flushes['c'] = [],
        evaluated_hand = {
            'rank'      : '',
            'name'      : '',
            'rating'    : 0,
            'cards'     : [],
        };
        
    // Getting the suit of the first card
    flushes[ cards[0][1] ].push( cards[0] );
    // Pushing the first card in the array of the straight
    straight.push( cards[0] );

    // For the rest of the cards
    for( var i=1 ; i<7 ; i++ ) {
        // Get the suit information
        flushes[ cards[i][1] ].push( cards[i] );

        // Get the card value
        var current_card_value = card_values.indexOf( cards[i][0] );
        var previous_card_value = card_values.indexOf( straight[straight.length-1][0] );
        
        // If the current value is smaller than the value of the previous card by one, push it to the straight array
        if( current_card_value + 1 == previous_card_value ) {
            straight.push( cards[i] );
        }
        // If it's not smaller by one and it's not equal and a straight hasn't been already completed, restart the array
        else if( current_card_value != previous_card_value && straight.length < 5 ) {
            straight = [cards[i]];
        }
        // Else if the values are the same, there is a pair that will be pushed to the pairs array
        else if( current_card_value == previous_card_value ) {
            if( typeof pairs[ cards[i][0] ] == 'undefined' ) {
                pairs[ cards[i][0] ] = [ cards[i-1], cards[i] ];
            } else {
                pairs[ cards[i][0] ].push( cards[i] );
            }
        }
    }

    // If there are four cards or more for a straight
    if( straight.length >= 4 ) {
        // If the last card calculated was a deuce and there is an ace in the hand, append it to the end of the straight
        if( straight[straight.length-1][0] == '2' && cards[0][0] == 'A' ) {
            straight.push( cards[0] );
        }
        
        // If there is a straight, change the evaluated hand to a straight
        if( straight.length >= 5 ) {
            evaluated_hand.rank = 'straight';
            evaluated_hand.cards = straight.slice( 0, 5 );
        }
    }
	
    // If there is a flush
    for( var i in flushes ) {
		var flush_length = flushes[i].length;
        if( flush_length >= 5 ) {
            // If there is also a straight, check for a straight flush
            if( evaluated_hand.rank == 'straight' ) {
				var straight_flush = [flushes[i][0]];
				var j=1;
				while( j < flush_length && straight_flush.length < 5 ) {
					var current_card_value = card_values.indexOf( flushes[i][j][0] );
					var previous_card_value = card_values.indexOf( flushes[i][j-1][0] );

					if( current_card_value+1 == previous_card_value ) {
						straight_flush.push( flushes[i][j] );
					}
					else if( current_card_value != previous_card_value && straight_flush.length < 5 ) {
						straight_flush = [flushes[i][j]];
					}
					j++;
				}
				if( straight_flush.length == 4 && straight_flush[3][0] == '2' && cards.indexOf('A'+i) >= 0 ) {
					straight_flush.push('A'+i);
				}
				if( straight_flush.length == 5 ) {
					evaluated_hand.cards = straight_flush;
					if( evaluated_hand.cards[0][0] == 'A' ) {
						evaluated_hand.rank = 'royal flush';
					} else {
						evaluated_hand.rank = 'straight flush';
					}
				}
            } 
			// If the hand isn't a straight flush, change it to a flush
			if( evaluated_hand.rank != 'straight flush' && evaluated_hand.rank != 'royal flush' ) {
                evaluated_hand.rank = 'flush';
                evaluated_hand.cards = flushes[i].slice( 0, 5 );
            }
            break;
        }
    }

    // If there isn't a flush or a straight, check for pairs
    if( !evaluated_hand.rank ) {
        var number_of_pairs = 0;
        // Counting how many pairs were formed
        for( var i in pairs ) {
            number_of_pairs++;
        }
        var kickers = 0;
        var i = 0;
        if( number_of_pairs ) {
            // If there is one pair
            if( number_of_pairs == 1 ) {
                // Add the pair to the evaluated cards that will be returned
                evaluated_hand.cards = pairs[Object.keys(pairs)[0]];
                // If it is a pair
                if( evaluated_hand.cards.length == 2 ) {
                    evaluated_hand.rank = 'pair';
                    while( kickers < 3 ) {
                        if( cards[i][0] != evaluated_hand.cards[0][0] ) {
                            evaluated_hand.cards.push( cards[i] );
                            kickers++;
                        }
                        i++;
                    }
                }
                // If it is a three of a kind
                else if( evaluated_hand.cards.length == 3 ) {
                    evaluated_hand.rank = 'three of a kind';
                    while( kickers < 2 ) {
                        if( cards[i][0] != evaluated_hand.cards[0][0] ) {
                            evaluated_hand.cards.push( cards[i] );
                            kickers++;
                        }
                        i++;
                    }
                }
                // If it is a four of a kind
                else if( evaluated_hand.cards.length == 4 ) {
                    evaluated_hand.rank = 'four of a kind';
                    while( kickers < 1 ) {
                        if( cards[i][0] != evaluated_hand.cards[0][0] ) {
                            evaluated_hand.cards.push( cards[i] );
                            kickers++;
                        }
                        i++;
                    }
                }
            }
            // If there are two pairs
            else if( number_of_pairs == 2 ) {
                // Add to the evaluated hand, the pair with the greatest value
                if( pairs[Object.keys(pairs)[0]].length > pairs[Object.keys(pairs)[1]].length || ( pairs[Object.keys(pairs)[0]].length == pairs[Object.keys(pairs)[1]].length && card_values.indexOf( Object.keys(pairs)[0] ) > card_values.indexOf( Object.keys(pairs)[1] ) ) ){
                    evaluated_hand.cards = pairs[ Object.keys(pairs)[0] ];
                    delete pairs[ Object.keys(pairs)[0] ];
                } else { 
                    evaluated_hand.cards = pairs[ Object.keys(pairs)[1] ];
                    delete pairs[ Object.keys(pairs)[1] ];
                }
                
                // If the biggest pair has two cards
                if( evaluated_hand.cards.length == 2 ) {
                    // Add the other two cards to the evaluated hand
                    for( var j=0 ; j<2 ; j++ ) {
                        evaluated_hand.cards.push( pairs[Object.keys(pairs)[0]][j] );
                    }
                    evaluated_hand.rank = 'two pair';
					// Add one kicker
                    while( kickers < 1 ) {
                        if( cards[i][0] != evaluated_hand.cards[0][0] && cards[i][0] != evaluated_hand.cards[2][0]) {
                            evaluated_hand.cards.push( cards[i] );
                            kickers++;
                        }
                        i++;
                    }
                }
                // If the biggest pair has three cards
                else if( evaluated_hand.cards.length == 3 ) {
					evaluated_hand.rank = 'full house';
					for( var j=0 ; j<2 ; j++ ) {
						evaluated_hand.cards.push( pairs[Object.keys(pairs)[0]][j] );
					}
				// If the biggest pair has four cards
                } else {
                    evaluated_hand.rank = 'four of a kind';
                    while( kickers < 1 ) {
                        if( cards[i][0] != evaluated_hand.cards[0][0] ) {
                            evaluated_hand.cards.push( cards[i] );
                            kickers++;
                        }
                        i++;
                    }
                }
            // If there are three pairs
            } else {
                var pair_keys = [ Object.keys(pairs)[0], Object.keys(pairs)[1], Object.keys(pairs)[2] ];
				// If there is a pair with three cards, it's the biggest pair
				for( var j in pairs ) {
					if( pairs[j].length == 3 ) {
						evaluated_hand.rank = 'full house';
						evaluated_hand.cards = pairs[j];
                        delete pairs[j];
						break;
					}
				}
				// Else, there are three pairs of two cards, so find the biggest one
				if( !evaluated_hand.cards.length ) {
					evaluated_hand.rank = 'two pair';
					if( card_values.indexOf( pair_keys[0] ) > card_values.indexOf( pair_keys[1] ) ) {
						if( card_values.indexOf( pair_keys[0] ) > card_values.indexOf( pair_keys[2] ) ) {
							evaluated_hand.cards = pairs[ pair_keys[0] ];
							delete pairs[ pair_keys[0] ];
						} else {
							evaluated_hand.cards = pairs[ pair_keys[2] ];
							delete pairs[ pair_keys[2] ];
						}
					} else {
						if( card_values.indexOf( pair_keys[1] ) > card_values.indexOf( pair_keys[2] ) ) {
							evaluated_hand.cards = pairs[ pair_keys[1] ];
							delete pairs[ pair_keys[1] ];
						} else {
							evaluated_hand.cards = pairs[ pair_keys[2] ];
							delete pairs[ pair_keys[2] ];
						}
					}
				}
				// Adding the second biggest pair in the hand
                if( card_values.indexOf( Object.keys(pairs)[0] ) > card_values.indexOf( Object.keys(pairs)[1] ) ) {
                    for( var j=0 ; j<2 ; j++ ) {
						evaluated_hand.cards.push( pairs[Object.keys(pairs)[0]][j] );
                    }
                } else {
                    for( var j=0 ; j<2 ; j++ ) {
						evaluated_hand.cards.push( pairs[Object.keys(pairs)[1]][j] );
                    }
                }
                
				// If the biggest pair has two cards, add one kicker
				if( evaluated_hand.rank == 'two pair' ) {
					while( kickers < 1 ) {
						if( cards[i][0] != evaluated_hand.cards[0][0] && cards[i][0] != evaluated_hand.cards[2][0]) {
							evaluated_hand.cards.push( cards[i] );
							kickers++;
						}
						i++;
					}
				}
            }
        }
    }

    if( !evaluated_hand.rank ) {
        evaluated_hand.rank = 'high card';
        evaluated_hand.cards = cards.slice( 0, 5 );
    }
	
	switch( evaluated_hand.rank ) {
		case 'high card':
			evaluated_hand.name = get_card_name( evaluated_hand.cards[0][0] ) + ' high';
			evaluated_hand.rating = rate_hand( evaluated_hand.cards );
			break;
		case 'pair':
            evaluated_hand.name = 'a pair of ' + get_card_name( evaluated_hand.cards[0][0], true );
			evaluated_hand.rating = rate_hand( evaluated_hand.cards ) + 1000000;
			break;
		case 'two pair':
			evaluated_hand.name = 'two pair, ' + get_card_name( evaluated_hand.cards[0][0], true ) + ' and ' + get_card_name( evaluated_hand.cards[2][0], true );
			evaluated_hand.rating = rate_hand( evaluated_hand.cards ) + 2000000;
			break;
		case 'three of a kind':
            evaluated_hand.name = 'three of a kind, ' + get_card_name( evaluated_hand.cards[0][0], true );
			evaluated_hand.rating = rate_hand( evaluated_hand.cards ) + 3000000;
			break;
		case 'straight':
            evaluated_hand.name = 'a straight to ' + get_card_name( straight[0][0] );
			evaluated_hand.rating = rate_hand( evaluated_hand.cards ) + 4000000;
			break;
		case 'flush':
            evaluated_hand.name = 'a flush, ' + get_card_name( evaluated_hand.cards[0][0] ) + ' high';
			evaluated_hand.rating = rate_hand( evaluated_hand.cards ) + 5000000;
			break;
		case 'full house':
			evaluated_hand.name = 'a full house, ' + get_card_name( evaluated_hand.cards[0][0], true ) + ' full of ' + get_card_name( evaluated_hand.cards[3][0], true );
			evaluated_hand.rating = rate_hand( evaluated_hand.cards ) + 6000000;
			break;
		case 'four of a kind':
            evaluated_hand.name = 'four of a kind, ' + get_card_name( evaluated_hand.cards[0][0], true );
			evaluated_hand.rating = rate_hand( evaluated_hand.cards ) + 7000000;
			break;
		case 'straight flush':
			evaluated_hand.name = 'a straight flush, ' + get_card_name( evaluated_hand.cards[4][0] ) + ' to ' + get_card_name( evaluated_hand.cards[0][0] );
			evaluated_hand.rating = rate_hand( evaluated_hand.cards ) + 8000000;
			break;
		case 'royal flush':
			evaluated_hand.name = 'a royal flush';
			evaluated_hand.rating = rate_hand( evaluated_hand.cards ) + 8000000;
			break;
	}
	this.evaluated_hand = evaluated_hand;
}

module.exports = Player;