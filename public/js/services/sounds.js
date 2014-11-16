/**
 * Returns functions that play the sounds of the application
 * @return object
 */
app.factory('sounds', [function() {
	var foldSound = document.getElementById("fold-sound"),
		checkSound = document.getElementById("check-sound"),
		callSound = document.getElementById("call-sound"),
		betSound = document.getElementById("bet-sound"),
		raiseSound = document.getElementById("raise-sound");

    return {
    	playFoldSound: function() {
    		foldSound.play();
    	},
    	playCheckSound: function() {
    		checkSound.play();
    	},
    	playCallSound: function() {
    		callSound.play();
    	},
    	playBetSound: function() {
    		betSound.play();
    	},
    	playRaiseSound: function() {
    		raiseSound.play();
    	}
    };
}]);