app.factory('AudioService', function () {
  return {
    check: function() {
      var check_sound = document.getElementById("check_sound");
      check_sound.play();
    }
  }
});