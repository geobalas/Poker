app.factory('socket', function ( $rootScope ) {
  var socket = io.connect();
  return {
    on: function( eventName, callback ) {
      socket.on( eventName, function () {  
        var args = arguments;
        $rootScope.$apply( function () {
          callback.apply( socket, args );
        });
      });
    },
    emit: function( eventName, data, callback ) {
      if ( typeof data == "function" ) {
        callback = data;
        socket.emit(eventName, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        })
      }
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    },
    removeAllListeners: function() {
      socket.removeAllListeners();
    }
  };
});