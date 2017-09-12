'use strict';

cs142App.controller('UserPhotosController', ['$scope', '$resource', '$routeParams', '$location',
  function($scope, $resource, $routeParams, $location) {
    $scope.main.title = "Photos Page";

    var usersListRes = $resource("/user/list");
    var users = usersListRes.query({}, function(){
        var mentioList = [];
        var userIdList = [];
        var userLabels = [];
        for(var i = 0; i < users.length; i++) {
            var mentioObj = { label: users[i].first_name + " " + users[i].last_name };
            mentioList.push(mentioObj);
            userIdList.push(users[i]._id);
            userLabels.push(mentioObj.label);
        }
        $scope.mentioList = mentioList;
        $scope.userIDs = userIdList;
        $scope.labels = userLabels;

    }, function errorHandler(err){
          console.log(err);
    });

    $scope.mentions = [];
    $scope.select = function(user) {
        var labelIndex = $scope.labels.indexOf(user.label);
        var userMentio = $scope.userIDs[labelIndex];
        $scope.mentions.push(userMentio);

        return user.label;
    };

    /*
     * Since the route is specified as '/photos/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */
    var userId = $routeParams.userId;
    $scope.main.userId = userId;

    var photoId = $routeParams.photoId;
    if(photoId) {
        $scope.main.isChecked = true;
    }

    $scope.$on('Photo Uploaded', function(event){
          var photoUpdateRes = $resource("/photosOfUser/:userId", {userId:'@id'});
          var updatePhoto = photoUpdateRes.query({userId: userId}, function(){
              if(updatePhoto) {
                  $scope.photos = updatePhoto;
              } else {
                  console.log("Could not refresh the photo page after upload.");
              }
          }, function errorHandling(error){
                console.log(error);
          });
    });

    $scope.prev = function() {
        if($scope.index <= 0) {
            $scope.prevDisable = true;
            $scope.nextDisable = false;

        } else if($scope.index > 0) {
            $scope.nextDisable = false;
            $scope.index = $scope.index - 1;
            $scope.currPhoto = $scope.photos[$scope.index];
            $location.url("/photos/" + userId + "/" + $scope.currPhoto._id);
        }
    };

    $scope.next = function() {
        if($scope.index >= $scope.photos.length-1) {
            $scope.nextDisable = true;
            $scope.prevDisable = false;

        } else {
            $scope.prevDisable = false;
            $scope.index = $scope.index + 1;
            $scope.currPhoto = $scope.photos[$scope.index];
            $location.url("/photos/" + userId + "/" + $scope.currPhoto._id);
        }
    };

    $scope.postComment = function(index, commentText) {
        var id = $scope.photos[index]._id;
        // $scope.commentPosted();
        var postCommentRes = $resource('/commentsOfPhoto/' + id);

        var mentionslist = $scope.mentions;
        console.log("Mentions for currPhoto ", mentionslist);
        var updateMentionsRes = $resource('/mentionsOfPhoto/' + id);
        var updateMentions = updateMentionsRes.save({mentions: mentionslist}, function(){
            if(updateMentions) {
                console.log("Updated Mentions!", updateMentions);
            }
            $scope.mentions = []; //Reset mentions after uploaded to database

        }, function errorHandling(err){
            console.log(err);
        });

        var refreshComment = postCommentRes.save({comment: commentText}, function(){
            if(refreshComment) {
                $scope.commentPosted();
                var photoListRes = $resource('photosOfUser/:userId', {userId: '@id'});
                var refreshPhotos = photoListRes.query({userId: userId}, function(){
                    if(refreshPhotos) {
                        $scope.photos = refreshPhotos;
                    } else {
                        console.log("Could not refresh photos page.");
                    }
                }, function errorHandling(err){
                    console.log(err);
                });
            }
        }, function errorHandling(err){
            console.log(err);
            alert("Incorrect comment formatting.");
        });
    };

    $scope.postComment_stepper = function(currPhoto, commentText) {
        var id = currPhoto._id;
        var postCommentStepRes = $resource('/commentsOfPhoto/' + id);
        var mentionsList = $scope.mentions;
        var updateMentionsResource = $resource('/mentionsOfPhoto/' + id);
        var update = updateMentionsResource.save({mentions: mentionsList}, function(){
            if(update) {
                console.log("Update mentions in stepper!", update);
            }
            $scope.mentions = [];

        }, function errorHandling(error){
            console.log("In error, stepper");
            console.log(error);
        });

        var refreshComment = postCommentStepRes.save({comment: commentText}, function(){
            if(refreshComment) {
                var photoListRes = $resource('photosOfUser/:userId', {userId: '@id'});
                var refreshCurrPhoto = photoListRes.query({userId: userId}, function(){
                    if(refreshCurrPhoto) {
                        $scope.commentPosted();
                        $scope.photos = refreshCurrPhoto;
                        for(var i = 0; i < $scope.photos.length; i++) {
                            if($scope.photos[i]._id === id) {
                                $scope.currPhoto = $scope.photos[i];
                            }
                        }
                    } else {
                        console.log("Could not refresh photos page.");
                    }
                }, function errorHandling(err){
                    console.log(err);
                });
            }
        }, function errorHandling(err){
            console.log(err);
            alert("Incorrect comment formatting.");
        });
    };

    var photosRes = $resource("/photosOfUser/:userId", {userId:'@id'});
    var photos = photosRes.query({userId:userId}, function(){
        if(photos) {
            $scope.photos = photos;
            $scope.index = 0;
            $scope.currPhoto = photos[$scope.index];
            $scope.main.photoId = $scope.photos[$scope.index]._id;

            if(!photoId) {
                photoId = $scope.photos[0]._id;
            }
            for(var i = 0; i < $scope.photos.length; i++) {
                if($scope.photos[i]._id === photoId) {
                    $scope.currPhoto = $scope.photos[i];
                    $scope.index = i;
                }
            }
        } else {
            console.log("error retrieving photos");
        }
    }, function(error){
        console.log("Error retrieving photos");
    });

    var userDetailRes = $resource('user/:userId', {userId: '@id'});
    var usermodel = userDetailRes.get({userId: userId}, function(){
        var status = "Photos of " + usermodel.first_name + " " + usermodel.last_name;
        $scope.user = usermodel;
        $scope.main.toolbarMessage = status;
    }, function(error){
        console.log("Could not load user details");
    });

    var testRes = $resource('/test/info');
    var testInfo = testRes.get({}, function(){
        $scope.main.version = testInfo.version;
    }, function(error){
        console.log("Could not retrieve version number.");
    });
}]);
