
/**
 * The deck "class"
 */
var Deck = function() {
	this.next_card = 0;
    this.cards = ['As', 'Ah', 'Ad', 'Ac',
                  'Ks', 'Kh', 'Kd', 'Kc',
                  'Qs', 'Qh', 'Qd', 'Qc',
                  'Js', 'Jh', 'Jd', 'Jc',
                  'Ts', 'Th', 'Td', 'Tc',
                  '9s', '9h', '9d', '9c',
                  '8s', '8h', '8d', '8c',
                  '7s', '7h', '7d', '7c',
                  '6s', '6h', '6d', '6c',
                  '5s', '5h', '5d', '5c',
                  '4s', '4h', '4d', '4c',
                  '3s', '3h', '3d', '3c',
                  '2s', '2h', '2d', '2c',];
}


// Method that suffles the deck
Deck.prototype.suffle = function(){
  this.next_card = 0;
    var suffled_deck = [];
    
    for( var i=0 ; i<52 ; i++ ) {
        var random_card = Math.floor( Math.random() * this.cards.length );
        suffled_deck.push( this.cards[random_card] );
        this.cards.splice( random_card, 1 );
    }
    this.cards = suffled_deck;
}

// Method that returns the next x cards of the deck
Deck.prototype.deal = function( number_of_cards ) {
  var dealt_cards = [];
  for( var i=0 ; i<number_of_cards && this.next_card<52 ; i++ ) {
    dealt_cards.push( this.cards[this.next_card] );
    this.next_card++;
  }
  return dealt_cards;
}

module.exports = Deck;