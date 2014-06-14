
/**
 * The table controller. It keeps track of the data on the interface,
 * depending on the replies from the server.
 */
app.controller( 'ChatController', ['$scope', function( $scope ) {
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
}]);