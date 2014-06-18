/**
 * Returns functions that play the sounds of the application
 * @return object
 */
app.factory('sounds', [function() {
	var fold_sound = document.getElementById("fold_sound"),
		check_sound = document.getElementById("check_sound"),
		call_sound = document.getElementById("call_sound"),
		bet_sound = document.getElementById("bet_sound"),
		raise_sound = document.getElementById("raise_sound");

    return {
    	play_fold_sound: function() {
    		fold_sound.play();
    	},
    	play_check_sound: function() {
    		check_sound.play();
    	},
    	play_call_sound: function() {
    		call_sound.play();
    	},
    	play_bet_sound: function() {
    		bet_sound.play();
    	},
    	play_raise_sound: function() {
    		raise_sound.play();
    	}
    };
}]);