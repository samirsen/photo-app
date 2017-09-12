cs142App.controller('loginRegisterController', ['$scope', '$resource', '$location',
    function ($scope, $resource, $location) {
        $scope.main.title = 'Login';
        $scope.username = '';
        $scope.password = '';
        $scope.confirmPassword = '';

        $scope.userDetails = {};
        $scope.userDetails.login_name = '';
        $scope.userDetails.password = '';
        $scope.userDetails.first_name = '';
        $scope.userDetails.last_name = '';
        $scope.userDetails.location = '';
        $scope.userDetails.description = '';
        $scope.userDetails.occupation = '';

        var loginInfoRes = $resource('/admin/login');
        $scope.submit = function() {
            var user = loginInfoRes.save({login_name: $scope.username, password: $scope.password}, function(){
                if(user) {
                  $scope.userId = user._id;
                  $scope.main.isLoggedIn = true;
                  $scope.main.loggedIn_message = "Hi, " + user.first_name;
                  $location.url('/users/' + $scope.userId);
                } else {
                    console.log("Something wrong with user object.");
                }
            }, function(err){
                alert("Incorrect username or password. Try again.");
                console.log("Could not retrieve user.");
            });
        };

        var registrationRes = $resource('/user');
        $scope.register = function() {
            if($scope.userDetails.password !== $scope.confirmPassword) {
                console.log("Entered passwords don't match.");
                alert("Passwords don't match! Please try again.");
                return;
            }
            $scope.userDetails.lastActivity = "Registered as new user"; 

            var newUser = registrationRes.save($scope.userDetails, function(){
                console.log(newUser);
                if(newUser) {
                    console.log("Successfully registered a new user!");
                    alert("You have successfully registered. Please login");
                    $scope.userDetails.login_name = '';
                    $scope.userDetails.password = '';
                    $scope.userDetails.first_name = '';
                    $scope.userDetails.last_name = '';
                    $scope.userDetails.location = '';
                    $scope.userDetails.description = '';
                    $scope.userDetails.occupation = '';
                    $scope.confirmPassword = '';
                }
                else {
                    console.log("Something wrong with new user created.");
                }
            }, function(error) {
                  alert("Could not register user. Try again.");
                  console.log("Could not create new user.");
            });
        };
}]);
