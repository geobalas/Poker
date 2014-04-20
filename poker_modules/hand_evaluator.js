function evaluator( cards ) {
    var card_values = [ '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A' ];

    // Returns the name of the card, in singular or in plural
    var get_card_name = function( card_value, plural ) {
        var card_names = { 'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack', 'T': 'ten', '9': 'nine', '8': 'eight', '7': 'seven', '6': 'six', '5': 'five', '4': 'four', '3': 'three', '2': 'deuce' }
        
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

    // Sorts the hand
    var sort = function() {
        swap(1, 2);
        swap(0, 2);
        swap(0, 1);
        swap(3, 4);
        swap(5, 6);
        swap(3, 5);
        swap(4, 6);
        swap(4, 5);
        swap(0, 4);
        swap(0, 3);
        swap(1, 5);
        swap(2, 6);
        swap(2, 5);
        swap(1, 3);
        swap(2, 4);
        swap(2, 3);
    }

    // Returns an object that has the name of the hand, its rank, rating and the cards
    var evaluate_hand = function() {
        // Sorting the 7 cards
        sort();

        var straight = [],
            flushes = {},
            pairs = {},
            current_card_value,
            previous_card_value;
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
            current_card_value = card_values.indexOf( cards[i][0] );
            previous_card_value = card_values.indexOf( straight[straight.length-1][0] );
            
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
                evaluated_hand.name = 'straight to ' + get_card_name( straight[0][0] );
            }
        }

        // If there is a flush
        for( var i in flushes ) {
            if( flushes[i].length >= 5 ) {
                // If there is also a straight, check for a straight flush
                if( evaluated_hand.name == 'straight' ) {

                } else {
                    // Else, change the hand to a flush
                    evaluated_hand.rank = 'flush';
                    evaluated_hand.cards = flushes[i].slice( 0, 5 );
                    evaluated_hand.name = 'flush, ' + get_card_name( flushes[i][0][0] ) + ' high';
                }
                break;
            }
        }

        // If there wasn't a flush or a straight, check for pairs
        if( !evaluated_hand.name ) {
            var number_of_pairs = 0;
            // Counting how many pairs were formed
            for( var i in pairs ) {
                if( pairs.hasOwnProperty(i) ) {
                    number_of_pairs++;
                }
            }
            var kickers = 0;
            var i = 0;
            if( number_of_pairs ) {
                // If there was one pair
                if( number_of_pairs == 1 ) {
                    // Add the pair to the evaluated cards that will be returned
                    evaluated_hand.cards = pairs[Object.keys(pairs)[0]];
                    // If it was a pair
                    if( evaluated_hand.cards.length == 2 ) {
                        evaluated_hand.rank = 'pair';
                        while( kickers < 3 ) {
                            if( cards[i][0] != evaluated_hand.cards[0][0] ) {
                                evaluated_hand.cards.push( cards[i] );
                                kickers++;
                            }
                            i++;
                        }
                        evaluated_hand.name = 'pair of ' + get_card_name( evaluated_hand.cards[0][0], true );
                    }
                    // If it was a three of a kind
                    else if( evaluated_hand.cards.length == 3 ) {
                        evaluated_hand.rank = 'three of a kind';
                        while( kickers < 2 ) {
                            if( cards[i][0] != evaluated_hand.cards[0][0] ) {
                                evaluated_hand.cards.push( cards[i] );
                                kickers++;
                            }
                            i++;
                        }
                        evaluated_hand.name = 'three of a kind, ' + get_card_name( evaluated_hand.cards[0][0], true );
                    }
                    // If it was a four of a kind
                    else if( evaluated_hand.cards.length == 4 ) {
                        evaluated_hand.rank = 'four of a kind';
                        while( kickers < 1 ) {
                            if( cards[i][0] != evaluated_hand.cards[0][0] ) {
                                evaluated_hand.cards.push( cards[i] );
                                kickers++;
                            }
                            i++;
                        }
                        evaluated_hand.name = 'four of a kind, ' + get_card_name( evaluated_hand.cards[0][0], true );
                    }
                }
                // If there were two pairs
                else if( number_of_pairs == 2 ) {
                    // Adding to the evaluated hand, the pair with the greatest value
                    if( pairs[Object.keys(pairs)[0]].length > pairs[Object.keys(pairs)[1]].length || ( pairs[Object.keys(pairs)[0]].length == pairs[Object.keys(pairs)[1]].length && card_values.indexOf( Object.keys(pairs)[0] ) > card_values.indexOf( Object.keys(pairs)[1] ) ) ){
                        evaluated_hand.cards = pairs[ Object.keys(pairs)[0] ];
                        delete pairs[ Object.keys(pairs)[0] ];
                    } else { 
                        evaluated_hand.cards = pairs[ Object.keys(pairs)[1] ];
                        delete pairs[ Object.keys(pairs)[1] ];
                    }
                    
                    // If the biggest pair had two cards
                    if( evaluated_hand.cards.length == 2 ) {
                        // Add the other two cards to the evaluated hand
                        for( var j in pairs[Object.keys(pairs)[0]] ) {
                            evaluated_hand.cards.push( pairs[Object.keys(pairs)[0]][j] );
                        }
                        evaluated_hand.rank = 'two pair';
                        while( kickers < 1 ) {
                            if( cards[i][0] != evaluated_hand.cards[0][0] && cards[i][0] != evaluated_hand.cards[2][0]) {
                                evaluated_hand.cards.push( cards[i] );
                                kickers++;
                            }
                            i++;
                        }
                        evaluated_hand.name = 'two pair, ' + get_card_name( evaluated_hand.cards[0][0], true ) + ' and ' + get_card_name( evaluated_hand.cards[2][0], true );
                    }
                    // If the greatest pair had three cards
                    else if( evaluated_hand.cards.length == 3 ) {
                        // If there is another pair with just two cards, it's a full house
                        if( pairs[Object.keys(pairs)[0]].length == 2 ) {
                            evaluated_hand.rank = 'full house';
                            for( var j in pairs[Object.keys(pairs)[0]] ) {
                                evaluated_hand.cards.push( pairs[Object.keys(pairs)[0]][j] );
                            }
                            evaluated_hand.name = 'full house, ' + get_card_name( evaluated_hand.cards[0][0], true ) + ' full of ' + get_card_name( evaluated_hand.cards[3][0], true );
                            
                        } else {
                            evaluated_hand.rank = 'three of a kind';
                                while( kickers < 2 ) {
                                if( cards[i][0] != evaluated_hand.cards[0][0] ) {
                                    evaluated_hand.cards.push( cards[i] );
                                    kickers++;
                                }
                                i++;
                            }
                            evaluated_hand.name = 'three of a kind, ' + get_card_name( evaluated_hand.cards[0][0], true );
                        }
                    }
                    else if( evaluated_hand.cards.length == 4 ) {
                        evaluated_hand.rank = 'four of a kind';
                        while( kickers < 1 ) {
                            if( cards[i][0] != evaluated_hand.cards[0][0] ) {
                                evaluated_hand.cards.push( cards[i] );
                                kickers++;
                            }
                            i++;
                        }
                        evaluated_hand.name = 'four of a kind, ' + get_card_name( evaluated_hand.cards[0][0], true );
                    }
                // If there were three pairs
                } else {
                    var pair_keys = [ Object.keys(pairs)[0], Object.keys(pairs)[1], Object.keys(pairs)[2] ];
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
                    if( card_values.indexOf( Object.keys(pairs)[0] ) > card_values.indexOf( Object.keys(pairs)[1] ) ) {
                        for( var j in pairs[Object.keys(pairs)[0]] ) {
                            evaluated_hand.cards.push( pairs[Object.keys(pairs)[0]][j] );
                        }
                    } else {
                        for( var j in pairs[Object.keys(pairs)[1]] ) {
                            evaluated_hand.cards.push( pairs[Object.keys(pairs)[1]][j] );
                        }
                    }
                    evaluated_hand.rank = 'two pair';
                    
                    while( kickers < 1 ) {
                        if( cards[i][0] != evaluated_hand.cards[0][0] && cards[i][0] != evaluated_hand.cards[2][0]) {
                            evaluated_hand.cards.push( cards[i] );
                            kickers++;
                        }
                        i++;
                    }
                    evaluated_hand.name = 'two pair, ' + get_card_name( evaluated_hand.cards[0][0], true ) + ' and ' + get_card_name( evaluated_hand.cards[2][0], true );
                }
            }
        }

        if( !evaluated_hand.name ) {
            evaluated_hand.rank = 'high card';
            evaluated_hand.cards = [];
            evaluated_hand.cards = cards.slice( 0, 5 );
            evaluated_hand.name = get_card_name( cards[0][0] ) + ' high';
        }

        console.log( 'THE HAND' );
        console.log( evaluated_hand.cards );
    }

    evaluate_hand();
    
    return evaluated_hand;
}

evaluator(['4c', 'Ts', '4d', '5d', '4h', '2s', 'Tc']);