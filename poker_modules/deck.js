/**
 * The deck "class"
 */
var Deck = function() {
	this.nextCard = 0;
  // let's hit some high hands, kings full of kings!
  this.cards = ['As', 'Ah', 'Ad', 'Ac',
                'Ks', 'Kh', 'Kd', 'Kc',
                'Ks', 'Kh', 'Kd', 'Kc',
                'Ks', 'Kh', 'Kd', 'Kc',
                'Ks', 'Kh', 'Kd', 'Kc',
                'Ks', 'Kh', 'Kd', 'Kc',
                'Ks', 'Kh', 'Kd', 'Kc',
                'Ks', 'Kh', 'Kd', 'Kc',
                'Ks', 'Kh', 'Kd', 'Kc',
                'Ks', 'Kh', 'Kd', 'Kc',
                '4s', '4h', '4d', '4c',
                '3s', '3h', '3d', '3c',
                '2s', '2h', '2d', '2c'];
};

// Method that shuffles the deck
Deck.prototype.shuffle = function(){
  // Going back to the top of the deck
  this.nextCard = 0;
  var shuffledDeck = [];

  for( var i=0 ; i<52 ; i++ ) {
      var random_card = this.cards.splice( Math.floor( Math.random() * this.cards.length ), 1 );
      shuffledDeck = shuffledDeck.concat( random_card );
  }
  this.cards = shuffledDeck;
};

// Method that returns the next x cards of the deck
Deck.prototype.deal = function( numberOfCards ) {
  var dealtCards = [];
  for( var i=0 ; i<numberOfCards && this.nextCard<52 ; i++ ) {
    dealtCards.push( this.cards[this.nextCard] );
    this.nextCard++;
  }
  return dealtCards;
};

module.exports = Deck;