
/**
 * The table controller. It keeps track of the data on the interface,
 * depending on the replies from the server.
 */
app.controller( 'TableController', ['$scope', '$rootScope', '$http', '$routeParams', 'sounds', function( $scope, $rootScope, $http, $routeParams, sounds ) {
	$scope.table = {};
	$scope.showing_chips_modal = false;
	$scope.action_state = '';
	$scope.table.dealer_seat = null;
	$scope.my_cards = ['', ''];
	$scope.my_seat = null;
	$scope.bet_amount = 0;
	$rootScope.sitting_on_table = null;

	// Existing listeners should be removed
	socket.removeAllListeners();

	// Getting the table data
	$http({
		url: '/table_data/' + $routeParams.table_id,
		method: 'GET'
	}).success(function( data, status, headers, config ) {
		$scope.table = data.table;
		$scope.buy_in_amount = data.table.max_buy_in;
		$scope.bet_amount = data.table.big_blind;
	});

	// Joining the socket room
	socket.emit( 'enter_room', $routeParams.table_id );

	$scope.get_card_class = function( seat, card ) {
		if( $scope.my_seat === seat ) {
			return $scope.my_cards[card];
		}
		else if ( typeof $scope.table.seats !== 'undefined' && typeof $scope.table.seats[seat] !== 'undefined' && $scope.table.seats[seat] && typeof $scope.table.seats[seat].cards !== 'undefined' && typeof $scope.table.seats[seat].cards[card] !== 'undefined' ) {
			return 'card-' + $scope.table.seats[seat].cards[card];
		}
		else {
			return 'card-back';
		}
	}

	$scope.min_bet_amount = function() {
		if( $scope.my_seat === null || typeof $scope.table.seats[$scope.my_seat] === 'undefined' || $scope.table.seats[$scope.my_seat] === null ) return 0;
		// If the pot was raised
		if( $scope.action_state === "act_betted_pot" ) {
			var proposed_bet = +$scope.table.biggest_bet + $scope.table.big_blind;
			return $scope.table.seats[$scope.my_seat].chips_in_play < proposed_bet ? $scope.table.seats[$scope.my_seat].chips_in_play : proposed_bet;
		} else {
			return $scope.table.seats[$scope.my_seat].chips_in_play < $scope.table.big_blind ? $scope.table.seats[$scope.my_seat].chips_in_play : $scope.table.big_blind;
		}
	}

	$scope.max_bet_amount = function() {
		if( $scope.my_seat === null || typeof $scope.table.seats[$scope.my_seat] === 'undefined' || $scope.table.seats[$scope.my_seat] === null ) return 0;
		return $scope.action_state === "act_betted_pot" ? $scope.table.seats[$scope.my_seat].chips_in_play + $scope.table.seats[$scope.my_seat].bet : $scope.table.seats[$scope.my_seat].chips_in_play;
	}

	$scope.call_amount = function() {
		if( $scope.my_seat === null || typeof $scope.table.seats[$scope.my_seat] === 'undefined' || $scope.table.seats[$scope.my_seat] == null ) return 0;
		var call_amount = +$scope.table.biggest_bet - $scope.table.seats[$scope.my_seat].bet;
		return call_amount > $scope.table.seats[$scope.my_seat].chips_in_play ? $scope.table.seats[$scope.my_seat].chips_in_play : call_amount;
	}

	$scope.show_leave_table_button = function() {
		return $rootScope.sitting_on_table !== null && ( !$rootScope.sitting_in || $scope.action_state === "waiting" );
	}

	$scope.show_post_small_blind_button = function() {
		return $scope.action_state === "act_not_betted_pot" || $scope.action_state === "act_betted_pot";
	}

	$scope.show_post_big_blind_button = function() {
		return $scope.action_state === "act_not_betted_pot" || $scope.action_state === "act_betted_pot";
	}

	$scope.show_fold_button = function() {
		return $scope.action_state === "act_not_betted_pot" || $scope.action_state === "act_betted_pot" || $scope.action_state === "act_others_all_in";
	}

	$scope.show_check_button = function() {
		return $scope.action_state === "act_not_betted_pot" || ( $scope.action_state === "act_betted_pot" && $scope.table.biggest_bet == $scope.table.seats[$scope.my_seat].bet );
	}

	$scope.show_call_button = function() {
		return $scope.action_state === "act_others_all_in" || $scope.action_state === "act_betted_pot"  && !( $scope.action_state === "act_betted_pot" && $scope.table.biggest_bet == $scope.table.seats[$scope.my_seat].bet );
	}

	$scope.show_bet_button = function() {
		return $scope.action_state === "act_not_betted_pot" && $scope.table.seats[$scope.my_seat].chips_in_play && $scope.table.biggest_bet < $scope.table.seats[$scope.my_seat].chips_in_play;
	}

	$scope.show_raise_button = function() {
		return $scope.action_state === "act_betted_pot" && $scope.table.seats[$scope.my_seat].chips_in_play && $scope.table.biggest_bet < $scope.table.seats[$scope.my_seat].chips_in_play;
	}

	$scope.show_bet_range = function() {
		return ($scope.action_state === "act_not_betted_pot" || $scope.action_state === "act_betted_pot") && $scope.table.seats[$scope.my_seat].chips_in_play && $scope.table.biggest_bet < $scope.table.seats[$scope.my_seat].chips_in_play;
	}

	$scope.show_bet_input = function() {
		return ($scope.action_state === "act_not_betted_pot" || $scope.action_state === "act_betted_pot")  && $scope.table.seats[$scope.my_seat].chips_in_play && $scope.table.biggest_bet < $scope.table.seats[$scope.my_seat].chips_in_play;
	}

	$scope.seat_occupied = function( seat ) {
		return !$rootScope.sitting_on_table || ( $scope.table.seats !== 'undefined' && typeof $scope.table.seats[seat] !== 'undefined' && $scope.table.seats[seat] && $scope.table.seats[seat].name );
	}

	$scope.pot_text = function() {
		if( typeof $scope.table.pot !== 'undefined' && $scope.table.pot[0].amount ) {
			var pot_text = 'Pot: ' + $scope.table.pot[0].amount;

			var pot_count = $scope.table.pot.length;
			if( pot_count > 1 ) {
				for( var i=1 ; i<pot_count ; i++ ) {
					pot_text += ' - Sidepot: ' + $scope.table.pot[i].amount;
				}
			}
			return pot_text;
		}
	}

	// Leaving the socket room
	$scope.leave_room = function() {
		socket.emit( 'leave_room' );
	};

	// A request to sit on a specific seat on the table
	$scope.sit_on_the_table = function( seat ) {
		socket.emit( 'sit_on_the_table', { 'seat': seat, 'table_id': $routeParams.table_id, 'chips': $scope.buy_in_amount }, function( response ){
			if( response.success ){
				$scope.show_buy_in_modal = false;
				$rootScope.sitting_on_table = $routeParams.table_id;
				$rootScope.sitting_in = true;
				$scope.buy_in_error = null;
				$scope.my_seat = seat;
				$scope.action_state = 'waiting';
				$scope.$digest();
			} else {
				if( response.error ) {
					$scope.buy_in_error = response.error;
					$scope.$digest();
				}
			}
		});
	}

	// Sit in the game
	$scope.sit_in = function() {
		socket.emit( 'sit_in', function( response ){
			if( response.success ){
				$rootScope.sitting_in = true;
				$rootScope.$digest();
			}
		});
	}

	// Leave the table (not the room)
	$scope.leave_table = function() {
		socket.emit( 'leave_table', function( response ) {
			if( response.success ) {
				$rootScope.sitting_on_table = null;
				$rootScope.total_chips = response.total_chips;
				$rootScope.sitting_in = false;
				$scope.action_state = '';
				$rootScope.$digest();
				$scope.$digest();
			}
		});
	}

	// Post a blind (or not)
	$scope.post_blind = function( posted ) {
		socket.emit( 'post_blind', posted, function( response ) {
			if( response.success && !posted ) {
				$rootScope.sitting_in = false;
			} else {
				sounds.play_bet_sound();
			}
			$scope.action_state = '';
			$scope.$digest();
		});
	}

	$scope.check = function() {
		socket.emit( 'check', function( response ) {
			if( response.success ) {
				sounds.play_check_sound();
				$scope.action_state = '';
				$scope.$digest();
			}
		});
	}

	$scope.fold = function() {
		socket.emit( 'fold', function( response ) {
			if( response.success ) {
				sounds.play_fold_sound();
				$scope.action_state = '';
				$scope.$digest();
			}
		});
	}

	$scope.call = function() {
		socket.emit( 'call', function( response ) {
			if( response.success ) {
				sounds.play_call_sound();
				$scope.action_state = '';
				$scope.$digest();
			}
		});
	}

	$scope.bet = function() {
		socket.emit( 'bet', $scope.bet_amount, function( response ) {
			if( response.success ) {
				sounds.play_bet_sound();
				$scope.action_state = '';
				$scope.$digest();
			}
		});
	}

	$scope.raise = function() {
		socket.emit( 'raise', $scope.bet_amount, function( response ) {
			if( response.success ) {
				sounds.play_raise_sound();
				$scope.action_state = '';
				$scope.$digest();
			}
		});
	}

	// When the table data have changed
	socket.on( 'table_data', function( data ) {
		$scope.table = data;
		switch ( data.log.action ) {
			case 'fold':
				sounds.play_fold_sound();
				break;
			case 'check':
				sounds.play_check_sound();
				break;
			case 'call':
				sounds.play_call_sound();
				break;
			case 'bet':
				sounds.play_bet_sound();
				break;
			case 'raise':
				sounds.play_raise_sound();
				break;
		}
		if( data.log.message ) {
			var message_box = document.querySelector('#messages');
			var message_element = angular.element( '<p class="log_message">' + data.log.message + '</p>' );
			angular.element( message_box ).append( message_element );
			message_box.scrollTop = message_box.scrollHeight;
		}
		$scope.$digest();
	});

	// When the game has stopped
	socket.on( 'game_stopped', function( data ) {
		$scope.table = data;
		$scope.action_state = 'waiting';
		$scope.$digest();
	});

	// When the player is asked to place the small blind
	socket.on( 'post_small_blind', function( data ) {
		$scope.action_state = 'post_small_blind';
		$scope.$digest();
	});

	// When the player is asked to place the big blind
	socket.on( 'post_big_blind', function( data ) {
		$scope.action_state = 'post_big_blind';
		$scope.$digest();
	});

	// When the player is dealt cards
	socket.on( 'dealing_cards', function( cards ) {
		$scope.my_cards[0] = 'card-'+cards[0];
		$scope.my_cards[1] = 'card-'+cards[1];
		$scope.$digest();
	});

	// When the user is asked to act and the pot was betted
	socket.on( 'act_betted_pot', function() {
		$scope.action_state = 'act_betted_pot';

		var proposed_bet = +$scope.table.biggest_bet + $scope.table.big_blind;
		$scope.bet_amount = $scope.table.seats[$scope.my_seat].chips_in_play < proposed_bet ? $scope.table.seats[$scope.my_seat].chips_in_play : proposed_bet;
		$scope.$digest();
	});

	// When the user is asked to act and the pot was not betted
	socket.on( 'act_not_betted_pot', function() {
		$scope.action_state = 'act_not_betted_pot';

		$scope.bet_amount = $scope.table.seats[$scope.my_seat].chips_in_play < $scope.table.big_blind ? $scope.table.seats[$scope.my_seat].chips_in_play : $scope.table.big_blind;
		$scope.$digest();
	});

	// When the user is asked to call an all in
	socket.on( 'act_others_all_in', function() {
		$scope.action_state = 'act_others_all_in';

		$scope.$digest();
	});
}]);