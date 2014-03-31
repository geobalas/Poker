
/**
 * The table controller. It keeps track of the data on the interface,
 * depending on the replies from the server.
 */
app.controller( 'TableController', function( $scope, $rootScope, $http, $routeParams ) {
	$scope.table = {};
	$scope.showing_chips_modal = false;
	$scope.action_state = '';
	$scope.table.dealer_seat = null;
	$scope.my_cards = ['', ''];
	$scope.my_seat = null;
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
	});

	// Joining the socket room
	socket.emit( 'enter_room', { 'table_id': $routeParams.table_id } );

	$scope.get_card_class = function( seat, card ) {
		if( $scope.my_seat === seat ) {
			return $scope.my_cards[card];
		}
		else if ( typeof $scope.table.seats[seat].cards[card] !== 'undefined' ) {
			return 'card-' + $scope.table.seats[seat].cards[card];
		}
		else {
			return 'card-back';
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
			}
			$scope.action_state = '';
			$scope.$digest();
		});
	}

	$scope.check = function() {
		socket.emit( 'check', function( response ) {
			if( response.success ) {
				$scope.action_state = '';
				$scope.$digest();
			}
		});
	}

	$scope.fold = function() {
		socket.emit( 'fold', function( response ) {
			if( response.success ) {
				$scope.action_state = '';
				$scope.$digest();
			}
		});
	}

	$scope.call = function() {
		socket.emit( 'call', function( response ) {
			if( response.success ) {
				$scope.action_state = '';
				$scope.$digest();
			}
		});
	}

	$scope.bet = function() {
		socket.emit( 'bet', function( response ) {
			if( response.success ) {
				$scope.action_state = '';
				$scope.$digest();
			}
		});
	}

	$scope.raise = function() {
		socket.emit( 'raise', function( response ) {
			if( response.success ) {
				$scope.action_state = '';
				$scope.$digest();
			}
		});
	}

	// When the table data have changed
	socket.on( 'table_data', function( data ) {
		$scope.table = data;
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
		$scope.$digest();
	});

	// When the user is asked to act and the pot was not betted
	socket.on( 'act_not_betted_pot', function() {
		$scope.action_state = 'act_not_betted_pot';
		$scope.$digest();
	});

	/**
	 * Chat
	 */
	$scope.send_message = function() {
		if ( $scope.message_text.trim() ) {
			var message = $scope.message_text.trim();
			var message_box = document.querySelector('#messages');
			socket.emit( 'send_message', message );

			var message_element = angular.element( '<p class="message"><b>You</b>: ' + html_entities( message ) + '</p>' );
			angular.element( message_box ).append( message_element );
			message_box.scrollTop = message_box.scrollHeight;
			$scope.message_text = '';
		}
	}

	socket.on( 'receive_message', function( data ) {
		var message_box = document.querySelector('#messages');
		var message_element = angular.element( '<p class="message"><b>' + data.sender + '</b>: ' + data.message + '</p>' );
		angular.element( message_box ).append( message_element );
		message_box.scrollTop = message_box.scrollHeight;
	});

	function html_entities(str) {
	    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}
});