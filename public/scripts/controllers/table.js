
/**
 * The table controller. It keeps track of the data on the interface,
 * depending on the replies from the server.
 */
app.controller( 'TableController', function( $scope, $rootScope, $http, $routeParams ) {
	$scope.table = {};
	$scope.showing_chips_modal = false;
	$scope.action_state = '';
	$scope.table.dealer_seat = null;
	$rootScope.sitting_on_table = null;

	$http({
		url: '/table_data/' + $routeParams.table_id,
		method: 'GET'
	}).success(function( data, status, headers, config ) {
		$scope.table = data.table;
	});

	$scope.sit_on_the_table = function( seat ) {
		socket.emit( 'sit_on_the_table', { 'seat': seat, 'table_id': $routeParams.table_id, 'chips': $scope.buy_in_amount }, function( response ){
			if( response.success ){
				$scope.show_buy_in_modal = false;
				$rootScope.sitting_on_table = response.sitting_on_table;
				$rootScope.sitting_in = true;
				$scope.buy_in_error = null;
			} else {
				if( response.error ) {
					$scope.buy_in_error = response.error;
					$scope.$digest();
				}
			}
		});
	}

	$scope.sit_in = function() {
		socket.emit( 'sit_in', function( response ){
			if( response.success ){
				$rootScope.sitting_in = true;
				$rootScope.$digest();
			}
		});
	}

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

	$scope.post_blind = function( posted ) {
		socket.emit( 'post_blind', posted, function( response ) {
			if( response.success && !posted ) {
				$rootScope.sitting_in = false;
			}
			$scope.action_state = '';
			$scope.$digest();
		});
	}

	socket.on( 'table_data', function( data ) {
		$scope.table = data;
		$scope.$digest();
	});

	socket.on( 'game_stopped', function( data ) {
		$scope.table = data;
		$scope.action_state = '';
		$scope.$digest();
	});

	socket.on( 'post_small_blind', function( data ) {
		$scope.action_state = 'post_small_blind';
		$scope.$digest();
	});

	socket.on( 'post_big_blind', function( data ) {
		$scope.action_state = 'post_big_blind';
		$scope.$digest();
	});

	socket.on( 'act_no_bets', function( data ) {
		$scope.action_state = 'act_no_bets';
		$scope.$digest();
	});

	socket.on( 'sat_out', function() {
		$scope.action_state = 'post_small_blind';
		$scope.$digest();
	});
});