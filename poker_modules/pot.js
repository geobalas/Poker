/**
 * The pot "class"
 */
var Pot = function() {
  this.amounts = [0];
  this.contributors = {};
};

Pot.prototype.clear = function() {
  this.amounts = [0];
  this.contributors = {};
};

Pot.prototype.add_players_bet = function( seat, bet ) {
  var last_pot = this.amounts.length-1;
  this.amounts[last_pot] += +bet;

  if( this.contributors[seat] ) {
    this.contributors[seat] += +bet; 
  } else {
    this.contributors[seat] = +bet;
  }
}

Pot.prototype.get_players_winnings = function( seat ) {
  var players_contribution = this.contributors[seat];
  var players_winnings = 0;
  
  for( var i in this.contributors ) {
    if( this.contributors[i] > players_contribution ) {
      players_winnings += players_contribution;
    } else {
      players_winnings += this.contributors[i];
    }
  }

  var amount_removed_from_pot = 0;
  var current_pot = this.amounts.length-1;
  while( amount_removed_from_pot < players_winnings ) {
    if( this.amounts[current_pot] + amount_removed_from_pot > players_winnings ) {
      this.amounts[current_pot] = this.amounts[current_pot] - players_winnings + amount_removed_from_pot;
      amount_removed_from_pot = players_winnings;
    } else {
      amount_removed_from_pot += +this.amounts.splice( current_pot )[0];
      current_pot--;
    }
  }
  
  return players_winnings;
}

Pot.prototype.is_empty = function() {
  return this.amounts.length;
}

module.exports = Pot;