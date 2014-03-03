app.controller('LobbyController', function( $scope, $rootScope, $http ) {
	$scope.lobby_tables = [];
	$scope.new_screen_name = '';

	$http({
		url: '/lobby_data',
		method: 'GET'
	}).success(function ( data, status, headers, config ) {
		for( table_id in data ) {
			$scope.lobby_tables[table_id] = data[table_id]
		}
	});

	$scope.register = function() {
		// If there is some trimmed value for a new screen name
		if( $scope.new_screen_name ) {
			socket.emit( 'register', { 'new_screen_name': $scope.new_screen_name }, function( response ){
				if( response.success ){
					$rootScope.screen_name = response.screen_name;
					$rootScope.total_chips = response.total_chips;
					$scope.register_error = '';
					$rootScope.$digest();
				}
				else if( response.message ) {
					$scope.register_error = response.message;
				}
				$scope.$digest();
			});
		}
	}
});