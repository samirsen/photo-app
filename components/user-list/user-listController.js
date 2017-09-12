'use strict';

cs142App.controller('UserListController', ['$scope', '$resource',
    function ($scope, $resource) {
        $scope.main.title = 'Users';
        var usersListRes = $resource("/user/list");
        var users = usersListRes.query({}, function(){
            $scope.usersList = users;

        }, function errorHandler(err){
              console.log(err);
        });

        $scope.$on("Photo Uploaded", function(event){
            var users_refresh = usersListRes.query({}, function(){
                $scope.usersList = users_refresh;

            }, function errorHandler(err){
                  console.log(err);
            });
        });

        $scope.$on("Posted Comment", function(event){
            var usersListResource = $resource("/user/list");
            var user_commented = usersListResource.query({}, function(){
                $scope.usersList = user_commented;

            }, function errorHandler(err){
                  console.log(err);
            });
        });

        $scope.main.photoPermissions = [];
        $scope.setPhotoPermissions = function(id){
            var index = $scope.main.photoPermissions.indexOf(id);
            if(index > -1) {
                $scope.main.photoPermissions.splice(index, 1);
            }
            else {
                $scope.main.photoPermissions.push(id);
            }
        };

        $scope.exists = function (item) {
            return $scope.main.photoPermissions.indexOf(item) > -1;
        };
}]);
