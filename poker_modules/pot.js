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
Pot.prototype.addTableBets = function( players ) {
  // Getting the current pot (the one in which new bets should be added)
  var currentPot = this.pots.length-1;

  // The smallest bet of the round
  var smallestBet = 0;
  // Flag that shows if all the bets have the same amount
  var allBetsAreEqual = true;

  // Trying to find the smallest bet of the player
  // and if all the bets are equal
  for( var i in players ) {
    if( players[i] && players[i].public.bet ) {
      if( !smallestBet ) {
        smallestBet = players[i].public.bet;
      }
      else if( players[i].public.bet != smallestBet ) {
        allBetsAreEqual = false;
        
        if( players[i].public.bet < smallestBet ) {
          smallestBet = players[i].public.bet;
        }
      }
    }
  }

  // If all the bets are equal, then remove the bets of the players and add
  // them to the pot as they are
  if( allBetsAreEqual ) {
    for( var i in players ) {
      if( players[i] && players[i].public.bet ) {
        this.pots[currentPot].amount += players[i].public.bet;
        players[i].public.bet = 0;
        if( this.pots[currentPot].contributors.indexOf( players[i].seat ) < 0 ) {
          this.pots[currentPot].contributors.push( players[i].seat );
        }
      }
    }
  } else {
    // If not all the bets are equal, remove from each player's bet the smallest bet
    // amount of the table, add these bets to the pot and then create a new empty pot
    // and recursively add the bets that remained, to the new pot
    for( var i in players ) {
      if( players[i] && players[i].public.bet ) {
        this.pots[currentPot].amount += smallestBet;
        players[i].public.bet = players[i].public.bet - smallestBet;
        if( this.pots[currentPot].contributors.indexOf( players[i].seat ) < 0 ) {
          this.pots[currentPot].contributors.push( players[i].seat );
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
    this.addTableBets( players );
  }
}

/**
 * Adds the player's bets to the pot
 * @param {[type]} player [description]
 */
Pot.prototype.addPlayersBets = function( player ) {
  // Getting the current pot (the one in which new bets should be added)
  var currentPot = this.pots.length-1;

  this.pots[currentPot].amount += player.public.bet;
  player.public.bet = 0;
  // If the player is not in the list of contributors, add them
  if( !this.pots[currentPot].contributors.indexOf( player.seat ) ) {
    this.pots[currentPot].contributors.push( player.seat );
  }
}

Pot.prototype.destributeToWinners = function( players, firstPlayerToAct ) {
  var potsCount = this.pots.length;
  var messages = [];

  // For each one of the pots, starting from the last one
  for( var i=potsCount-1 ; i>=0 ; i-- ) {
    var winners = [];
    var bestRating = 0;
    var playersCount = players.length;
    for( var j=0 ; j<playersCount ; j++ ) {
      if( players[j] && players[j].public.inHand && this.pots[i].contributors.indexOf( players[j].seat ) >= 0 ) {
        if( players[j].evaluatedHand.rating > bestRating ) {
          bestRating = players[j].evaluatedHand.rating;
          winners = [ players[j].seat ];
        }
        else if( players[j].evaluatedHand.rating === bestRating ) {
          winners.push( players[j].seat );
        }
      }
    }
    if( winners.length === 1 ) {
      players[winners[0]].public.chipsInPlay += this.pots[i].amount;
      var htmlHand = '[' + players[winners[0]].evaluatedHand.cards.join(', ') + ']';
      htmlHand = htmlHand.replace(/s/g, '&#9824;').replace(/c/g, '&#9827;').replace(/h/g, '&#9829;').replace(/d/g, '&#9830;');
      messages.push( players[winners[0]].public.name + ' wins the pot (' + this.pots[i].amount + ') with ' + players[winners[0]].evaluatedHand.name + ' ' + htmlHand );
    } else {
      var winnersCount = winners.length;

      var winnings = ~~( this.pots[i].amount / winnersCount );
      var oddChip = winnings * winnersCount !== this.pots[i].amount;

      for( var j in winners ) {
        var playersWinnings = 0;
        if( oddChip && players[winners[j]].seat === firstPlayerToAct ) {
          playersWinnings = winnings + 1;
        } else {
          playersWinnings = winnings;
        }

        players[winners[j]].public.chipsInPlay += playersWinnings;
        var htmlHand = '[' + players[winners[j]].evaluatedHand.cards.join(', ') + ']';
        htmlHand = htmlHand.replace(/s/g, '&#9824;').replace(/c/g, '&#9827;').replace(/h/g, '&#9829;').replace(/d/g, '&#9830;');
        messages.push( players[winners[j]].public.name + ' ties the pot (' + playersWinnings + ') with ' + players[winners[j]].evaluatedHand.name + ' ' + htmlHand );
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
Pot.prototype.giveToWinner = function( winner ) {
  var potsCount = this.pots.length;
  var totalAmount = 0;

  for( var i=potsCount-1 ; i>=0 ; i-- ) {
    winner.public.chipsInPlay += this.pots[i].amount;
    totalAmount += this.pots[i].amount;
  }

  this.reset();
  return winner.public.name + ' wins the pot (' + totalAmount + ')';
}

/**
 * Removing a player from all the pots
 * @param  number   seat
 */
Pot.prototype.removePlayer = function( seat ) {
  var potsCount = this.pots.length;
  for( var i=0 ; i<potsCount ; i++ ) {
    var placeInArray = this.pots[i].contributors.indexOf( seat );
    if( placeInArray >= 0 ) {
      this.pots[i].contributors.splice( placeInArray, 1 );
    }
  }
}

Pot.prototype.isEmpty = function() {
  return !this.pots[0].amount;
}


module.exports = Pot;