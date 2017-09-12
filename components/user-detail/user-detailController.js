'use strict';

cs142App.controller('UserDetailController', ['$scope', '$resource', '$routeParams',
  function ($scope, $resource, $routeParams) {
    $scope.main.title = "User Details";
    /*
     * Since the route is specified as '/users/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */
    var userId = $routeParams.userId;
    $scope.userId = userId;

    $scope.$on('Photo Uploaded', function(event){
        var recentPhotoResource = $resource('/mostRecentPhoto/' + userId, {userId: '@id'});
        var mostRecentPhotoMod = recentPhotoResource.get({}, function(){
            if(mostRecentPhotoMod){
                $scope.mostRecentPhoto = mostRecentPhotoMod;
            }
            else {
                console.log("Something wrong retrieving most recent photo.");
            }

        }, function errorHandling(error){
            console.log("Entered ERROR ", error);
            $scope.mostRecentPhoto = null;
        });
    });

    var userDetailRes = $resource('user/:userId', {userId: '@id'});
    var usermodel = userDetailRes.get({userId: userId}, function(){
        var status = usermodel.first_name + " " + usermodel.last_name;
        $scope.user = usermodel;
        $scope.main.toolbarMessage = status;
    }, function(error){
        console.log("Could not load user details");
    });

    $scope.mostRecentPhoto = {};
    var recentPhotoRes = $resource('/mostRecentPhoto/' + userId, {userId: '@id'});
    var mostRecentPhotoModel = recentPhotoRes.get({}, function(){
        if(mostRecentPhotoModel){
            $scope.mostRecentPhoto = mostRecentPhotoModel;
        }
        else {
            $scope.mostRecentPhoto = null;
            console.log("Not visible to current user");
        }

    }, function errorHandling(error){
        console.log("Entered ERROR ", error);
        $scope.mostRecentPhoto = null;
    });

    $scope.mostCommentsPhoto = {commentsCount: 0, photo: {}};
    var mostCommentsRes = $resource('/mostCommentedPhoto/' + userId, {userId: '@id'});
    var mostCommentResModel = mostCommentsRes.get({}, function(){
        if(mostCommentResModel) {
            $scope.mostCommentsPhoto = mostCommentResModel;
        }
        else {
            console.log("Something wrong retrieving most commented photo.");
        }
    }, function errorHandling(error){
        console.log("Entered ERROR", error);
        $scope.mostCommentsPhoto = null; 
    });

    $scope.photoMentions = [];
    $scope.photoOwner = [];
    var mentionsDetailRes = $resource('/userMentions/:userId', {userId: '@id'});
    var photoMentionsModel = mentionsDetailRes.query({userId: userId}, function(){
        if(photoMentionsModel) {
            $scope.photoMentions = photoMentionsModel;
            for(var i = 0; i < $scope.photoMentions.length; i++) {
                var owner = userDetailRes.get({userId: $scope.photoMentions[i].user_id}, function(){
                    $scope.photoOwner.push(owner);
                });
            }
        }
        else{
            console.log("Could not find any photo mentions.");
        }
    }, function errorHandler(error) {
        console.log(error);
    });

    var testRes = $resource('/test/info');
    var testInfo = testRes.get({}, function(){
        $scope.main.version = testInfo.version;
    }, function(error){
        console.log("Could retrieve version number.");
    });
}]);
