var socket = io.connect();

var app = angular.module( 'app', ['ngRoute'] ).config( function( $routeProvider, $locationProvider ) {
	$routeProvider.when('/table-10/:tableId', {
		templateUrl: '/table-10-handed.html',
		controller: 'TableController', 
	});

	$routeProvider.when('/table-6/:tableId', {
		templateUrl: '/table-6-handed.html',
		controller: 'TableController', 
	});

	$routeProvider.when('/table-2/:tableId', {
		templateUrl: '/table-2-handed.html',
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
	$rootScope.screenName = '';
	$rootScope.totalChips = 0;
	$rootScope.sittingOnTable = '';
});