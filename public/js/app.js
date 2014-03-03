var socket = io.connect();

var app = angular.module( 'app', ['ngRoute'] ).config( function( $routeProvider, $locationProvider ) {
	$routeProvider.when('/table_10/:table_id', {
		templateUrl: '/table_10_handed.html',
		controller: 'TableController', 
	});

	$routeProvider.when('/table_6/:table_id', {
		templateUrl: '/table_6_handed.html',
		controller: 'TableController', 
	});

	$routeProvider.when('/table_2/:table_id', {
		templateUrl: '/table_2_handed.html',
		controller: 'TableController', 
	});

	$routeProvider.when('/', {
		templateUrl: '/lobby.html',
		controller: 'LobbyController', 
	});

	$routeProvider.otherwise( { redirectTo: '/' } );

	$locationProvider.html5Mode(true).hashPrefix('!');
});

app.run( function( $rootScope ) {
	$rootScope.screen_name = '';
	$rootScope.total_chips = 0;
	$rootScope.sitting_on_table = '';
});