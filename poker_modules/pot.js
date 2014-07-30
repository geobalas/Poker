/**
 * The pot object
 */
var Pot = function() {
  // The pot may be split to several amounts, since not all players
  // have the same money on the table
  // Each portion of the pot has an amount and an array of the
  // contributors (players who have betted in the pot and can
  // win it in the showdown)
  this.pots = [
    { 
      amount: 0,
      contributors: []
    }
  ];
};

/**
 * Method that resets the pot to its initial state
 */
Pot.prototype.reset = function() {
  this.pots.length = 1;
  this.pots[0].amount = 0;
  this.pots[0].contributors = [];
};

/**
 * Method that gets the bets of the players and adds them to the pot
 * @param array players (the array of the tables as it exists in the table)
 */
Pot.prototype.add_table_bets = function( players ) {
  // Getting the current pot (the one in which new bets should be added)
  var current_pot = this.pots.length-1;

  // The smallest bet of the round
  var smallest_bet = 0;
  // Flag that shows if all the bets have the same amount
  var all_bets_are_equal = true;

  // Trying to find the smallest bet of the player
  // and if all the bets are equal
  for( var i in players ) {
    if( players[i] && players[i].public.bet ) {
      if( !smallest_bet ) {
        smallest_bet = players[i].public.bet;
      }
      else if( players[i].public.bet != smallest_bet ) {
        all_bets_are_equal = false;
        
        if( players[i].public.bet < smallest_bet ) {
          smallest_bet = players[i].public.bet;
        }
      }
    }
  }

  // If all the bets are equal, then remove the bets of the players and add
  // them to the pot as they are
  if( all_bets_are_equal ) {
    for( var i in players ) {
      if( players[i] && players[i].public.bet ) {
        this.pots[current_pot].amount += players[i].public.bet;
        players[i].public.bet = 0;
        if( this.pots[current_pot].contributors.indexOf( players[i].seat ) < 0 ) {
          this.pots[current_pot].contributors.push( players[i].seat );
        }
      }
    }
  } else {
    // If not all the bets are equal, remove from each player's bet the smallest bet
    // amount of the table, add these bets to the pot and then create a new empty pot
    // and recursively add the bets that remained, to the new pot
    for( var i in players ) {
      if( players[i] && players[i].public.bet ) {
        this.pots[current_pot].amount += smallest_bet;
        players[i].public.bet = players[i].public.bet - smallest_bet;
        if( this.pots[current_pot].contributors.indexOf( players[i].seat ) < 0 ) {
          this.pots[current_pot].contributors.push( players[i].seat );
        }
      }
    }

    // Creating a new pot
    this.pots.push(
      { 
        amount: 0,
        contributors: []
      }
    );

    // Recursion
    this.add_table_bets( players );
  }
}

/**
 * Adds the player's bets to the pot
 * @param {[type]} player [description]
 */
Pot.prototype.add_players_bets = function( player ) {
  // Getting the current pot (the one in which new bets should be added)
  var current_pot = this.pots.length-1;

  this.pots[current_pot].amount += player.public.bet;
  player.public.bet = 0;
  // If the player is not in the list of contributors, add them
  if( !this.pots[current_pot].contributors.indexOf( player.seat ) ) {
    this.pots[current_pot].contributors.push( player.seat );
  }
}

Pot.prototype.destribute_to_winners = function( players, first_player_to_act ) {
  var pots_count = this.pots.length;
  var messages = [];

  // For each one of the pots, starting from the last one
  for( var i=pots_count-1 ; i>=0 ; i-- ) {
    var winners = [];
    var best_rating = 0;
    var players_count = players.length;
    for( var j=0 ; j<players_count ; j++ ) {
      if( players[j] && players[j].public.in_hand && this.pots[i].contributors.indexOf( players[j].seat ) >= 0 ) {
        if( players[j].evaluated_hand.rating > best_rating ) {
          best_rating = players[j].evaluated_hand.rating;
          winners = [ players[j].seat ];
        }
        else if( players[j].evaluated_hand.rating === best_rating ) {
          winners.push( players[j].seat );
        }
      }
    }
    if( winners.length === 1 ) {
      players[winners[0]].public.chips_in_play += this.pots[i].amount;
      var html_hand = '[' + players[winners[0]].evaluated_hand.cards.join(', ') + ']';
      html_hand = html_hand.replace(/s/g, '&#9824;').replace(/c/g, '&#9827;').replace(/h/g, '&#9829;').replace(/d/g, '&#9830;');
      messages.push( players[winners[0]].public.name + ' wins the pot (' + this.pots[i].amount + ') with ' + players[winners[0]].evaluated_hand.name + ' ' + html_hand );
    } else {
      var winners_count = winners.length;

      var winnings = ~~( this.pots[i].amount / winners_count );
      var odd_chip = winnings * winners_count !== this.pots[i].amount;

      for( var j in winners ) {
        var players_winnings = 0;
        if( odd_chip && players[winners[j]].seat === first_player_to_act ) {
          players_winnings = winnings + 1;
        } else {
          players_winnings = winnings;
        }

        players[winners[j]].public.chips_in_play += players_winnings;
        var html_hand = '[' + players[winners[j]].evaluated_hand.cards.join(', ') + ']';
        html_hand = html_hand.replace(/s/g, '&#9824;').replace(/c/g, '&#9827;').replace(/h/g, '&#9829;').replace(/d/g, '&#9830;');
        messages.push( players[winners[j]].public.name + ' ties the pot (' + players_winnings + ') with ' + players[winners[j]].evaluated_hand.name + ' ' + html_hand );
      }
    }
  }

  this.reset();

  return messages;
}

/**
 * Method that gives the pot to the winner, if the winner is already known
 * (e.g. everyone has folded)
 * @param object  winner
 */
Pot.prototype.give_to_winner = function( winner ) {
  var pots_count = this.pots.length;
  var total_amount = 0;

  for( var i=pots_count-1 ; i>=0 ; i-- ) {
    winner.public.chips_in_play += this.pots[i].amount;
    total_amount += this.pots[i].amount;
  }

  this.reset();
  return winner.public.name + ' wins the pot (' + total_amount + ')';
}

/**
 * Removing a player from all the pots
 * @param  number   seat
 */
Pot.prototype.remove_player = function( seat ) {
  var pots_count = this.pots.length;
  for( var i=0 ; i<pots_count ; i++ ) {
    var place_in_array = this.pots[i].contributors.indexOf( seat );
    if( place_in_array >= 0 ) {
      this.pots[i].contributors.splice( place_in_array, 1 );
    }
  }
}

Pot.prototype.is_empty = function() {
  return !this.pots[0].amount;
}


module.exports = Pot;