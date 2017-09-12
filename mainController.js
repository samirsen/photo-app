'use strict';

var cs142App = angular.module('cs142App', ['ngRoute', 'ngMaterial', 'mentio', 'ngResource']);

cs142App.config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
 		.primaryPalette('light-green')
 		.accentPalette('red');
});

cs142App.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
            when('/users', {
                templateUrl: 'components/user-list/user-listTemplate.html',
                controller: 'UserListController'
            }).
            when('/users/:userId', {
                templateUrl: 'components/user-detail/user-detailTemplate.html',
                controller: 'UserDetailController'
            }).
            when('/photos/:userId', {
                templateUrl: 'components/user-photos/user-photosTemplate.html',
                controller: 'UserPhotosController'
            }).
            when('/photos/:userId/:photoId', {
                templateUrl: 'components/user-photos/user-photosTemplate.html',
                controller: 'UserPhotosController'
            }).
            when('/login-register', {
                templateUrl: 'components/login-register/login-registerTemplate.html',
                controller: 'loginRegisterController'
            }).
            otherwise({
                redirectTo: '/users'
            });
    }]);

cs142App.controller('MainController', ['$scope', '$resource', '$location', '$http', '$rootScope',
    function ($scope, $resource, $location, $http, $rootScope) {
        $scope.main = {};
        $scope.main.title = 'Users';
        $scope.main.toolbarMessage = "Samir Sen";
        $scope.main.version = 1.0;
        $scope.main.isLoggedIn = false;
        $scope.main.login_message = 'Please Login';
        $scope.main.loggedIn_message = 'Hi, Samir';
        $scope.main.photoPermissions = [];

        $scope.main.isChecked = false;

        $scope.commentPosted = function() {
            $rootScope.$broadcast("Posted Comment"); //transmit to UserListController
        };

        $scope.main.updateUrl = function() {
            var url = $location.url();
            if($scope.main.isChecked && url.includes("photos")) {
                var tokens = url.split("/");
                var userId = tokens[2];
                $location.url("/photos/" + userId + "/" + $scope.main.photoId);

            } else if(!$scope.main.isChecked && url.includes("photos")) {
                var infoTokens = url.split("/");
                var user_id = infoTokens[2];
                $location.url("/photos/" + user_id);
            }
        };

        var logoutRes = $resource('/admin/logout');
        $scope.main.logout = function() {
            logoutRes.save({}, function(){
                $scope.main.isLoggedIn = false;
                $scope.main.loggedIn_message = "";
                console.log("Logout successful");

            }, function errorHandling(err){
                console.log("Error occurred during logout!");
            });
        };

        $rootScope.$on("$routeChangeStart", function(event, next, current) {
            //check the server to see if there is a session
            var sessionRes = $resource('/session/loginInfo');
            var currSession = sessionRes.get({}, function(){
                if ($scope.main.isLoggedIn === false && currSession.status === false) {
                    console.log("There are no users currently logged in!");
                     // no logged user, redirect to /login-register unless already there
                    if (next.templateUrl !== "components/login-register/login-registerTemplate.html") {
                        $location.path("/login-register");
                    }
                } else if(currSession.status){
                    $scope.main.isLoggedIn = true;
                    $scope.main.loggedIn_message = "Hi, " + currSession.name;
                }
            }, function(error){
                console.log(error);
            });
        });

        var selectedPhotoFile;   // Holds the last file selected by the user

        // Called on file selection - we simply save a reference to the file in selectedPhotoFile
        $scope.inputFileNameChanged = function (element) {
            selectedPhotoFile = element.files[0];
        };

        // Has the user selected a file?
        $scope.inputFileNameSelected = function () {
            return !!selectedPhotoFile;
        };

        // Upload the photo file selected by the user using a post request to the URL /photos/new
        $scope.uploadPhoto = function(list) {
            if (!$scope.inputFileNameSelected()) {
                console.error("uploadPhoto called with no selected file");
                return;
            }
            console.log('fileSubmitted', selectedPhotoFile);
            console.log(list);

            // Create a DOM form and add the file to it under the name uploadedphoto
            var domForm = new FormData();
            domForm.append('uploadedphoto', selectedPhotoFile);
            domForm.append('permissions',JSON.stringify(list));

            // Using $http to POST the form
            $http.post('/photos/new', domForm, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            }).then(function successCallback(response){
                // The photo was successfully uploaded. XXX - Do whatever you want on success.
                // console.log("Successfully uploaded photo.", response.data);
                $rootScope.$broadcast('Photo Uploaded');
                $scope.setVisible = false;

            }, function errorCallback(response){
                // Couldn't upload the photo. XXX  - Do whatever you want on failure.
                console.error('ERROR uploading photo', response);
            });
        };

        $scope.setVisible = false;
        //Set who can view your uploaded photo.
        $scope.setVisibility = function() {
            if (!$scope.inputFileNameSelected()) {
                console.error("Cannot set visibility without selecting file.");
                return;
            }
            if($scope.main.isLoggedIn) {
                $scope.setVisible = true;
            }
        };
    }]);
