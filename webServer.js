 "use strict";

/* jshint node: true */

/*
 * This builds on the webServer of previous projects in that it exports the current
 * directory via webserver listing on a hard code (see portno below) port. It also
 * establishes a connection to the MongoDB named 'cs142project6'.
 *
 * To start the webserver run the command:
 *    node webServer.js
 *
 * Note that anyone able to connect to localhost:portNo will be able to fetch any file accessible
 * to the current user in the current directory or any of its children.
 *
 * This webServer exports the following URLs:
 * /              -  Returns a text status message.  Good for testing web server running.
 * /test          - (Same as /test/info)
 * /test/info     -  Returns the SchemaInfo object from the database (JSON format).  Good
 *                   for testing database connectivity.
 * /test/counts   -  Returns the population counts of the cs142 collections in the database.
 *                   Format is a JSON object with properties being the collection name and
 *                   the values being the counts.
 *
 * The following URLs need to be changed to fetch there reply values from the database.
 * /user/list     -  Returns an array containing all the User objects from the database.
 *                   (JSON format)
 * /user/:id      -  Returns the User object with the _id of id. (JSON format).
 * /photosOfUser/:id' - Returns an array with all the photos of the User (id). Each photo
 *                      should have all the Comments on the Photo (JSON format)
 *
 */

var mongoose = require('mongoose');
var async = require('async');

// Load the Mongoose schema for User, Photo, and SchemaInfo
var User = require('./schema/user.js');
var Photo = require('./schema/photo.js');
var SchemaInfo = require('./schema/schemaInfo.js');
var Password = require('./cs142password.js');

var express = require('express');
var app = express();

var session = require('express-session');
var bodyParser = require('body-parser');
var multer = require('multer');

var processFormBody = multer({storage: multer.memoryStorage()}).single('uploadedphoto');
var fs = require('fs');

// XXX - Your submission should work without this line
var cs142models = require('./modelData/photoApp.js').cs142models;

mongoose.connect('mongodb://localhost/cs142project6');

// We have the express static module (http://expressjs.com/en/starter/static-files.html) do all
// the work for us.
app.use(express.static(__dirname));

app.use(session({secret: 'secretKey', resave: false, saveUninitialized: false}));
app.use(bodyParser.json());

app.get('/', function (request, response) {
    response.send('Simple web server of files from ' + __dirname);
});

/*
 * Use express to handle argument passing in the URL.  This .get will cause express
 * To accept URLs with /test/<something> and return the something in request.params.p1
 * If implement the get as follows:
 * /test or /test/info - Return the SchemaInfo object of the database in JSON format. This
 *                       is good for testing connectivity with  MongoDB.
 * /test/counts - Return an object with the counts of the different collections in JSON format
 */
app.get('/test/:p1', function (request, response) {
    // Express parses the ":p1" from the URL and returns it in the request.params objects.
    console.log('/test called with param1 = ', request.params.p1);

    var param = request.params.p1 || 'info';

    if (param === 'info') {
        // Fetch the SchemaInfo. There should only one of them. The query of {} will match it.
        SchemaInfo.find({}, function (err, info) {
            if (err) {
                // Query returned an error.  We pass it back to the browser with an Internal Service
                // Error (500) error code.
                console.error('Doing /user/info error:', err);
                response.status(500).send(JSON.stringify(err));
                return;
            }
            if (info.length === 0) {
                // Query didn't return an error but didn't find the SchemaInfo object - This
                // is also an internal error return.
                response.status(500).send('Missing SchemaInfo');
                return;
            }

            // We got the object - return it in JSON format.
            console.log('SchemaInfo', info[0]);
            response.end(JSON.stringify(info[0]));
        });
    } else if (param === 'counts') {
        // In order to return the counts of all the collections we need to do an async
        // call to each collections. That is tricky to do so we use the async package
        // do the work.  We put the collections into array and use async.each to
        // do each .count() query.
        var collections = [
            {name: 'user', collection: User},
            {name: 'photo', collection: Photo},
            {name: 'schemaInfo', collection: SchemaInfo}
        ];
        async.each(collections, function (col, done_callback) {
            col.collection.count({}, function (err, count) {
                col.count = count;
                done_callback(err);
            });
        }, function (err) {
            if (err) {
                response.status(500).send(JSON.stringify(err));
            } else {
                var obj = {};
                for (var i = 0; i < collections.length; i++) {
                    obj[collections[i].name] = collections[i].count;
                }
                response.end(JSON.stringify(obj));
            }
        });
    } else {
        // If we know understand the parameter we return a (Bad Parameter) (400) status.
        response.status(400).send('Bad param ' + param);
    }
});

/*
 * URL /user/list - Return all the User object.
 */
app.get('/user/list', function (request, response) {

    if(!request.session.user_id) {
        response.status(401).send("Unauthorized access to list of users.");
        return;
    }

    User.find({}, '_id first_name last_name last_activity last_photo', function(error, userList) {
        if(error) {
            response.status(400).send(JSON.stringify(error));
            return;
        }
        if(userList.length === 0) {
            response.status(500).send(JSON.stringify("There are no users."));
            return;
        }

        response.status(200).send(JSON.stringify(userList));
    });
});

/*
 * URL /user/:id - Return the information for User (id)
 */
app.get('/user/:id', function (request, response) {

    if(!request.session.user_id) {
        response.status(401).send("Unauthorized access to user.");
        return;
    }

    var id = request.params.id;

    User.findOne({'_id':id}, function(error, user){
        if(error) {
            response.status(400).send(JSON.stringify(error));
            return;
        }
        if(user === null){
            console.log('User with _id:' + id + ' not found.');
            response.status(500).send('Not found');
            return;
        }
        var userDetails = {_id: user._id,
                           first_name: user.first_name,
                           last_name: user.last_name,
                           location: user.location,
                           description: user.description,
                           occupation: user.occupation};

        response.status(200).send(JSON.stringify(userDetails));
    });
});

/*Get most recent photos*/
app.get('/mostRecentPhoto/:userId', function(request, response){
    var currUser = request.session.user_id;
    var id = request.params.userId;

    Photo.find({'user_id': id}, 'file_name date_time user_id comments permissions', function(error, photos) {
        if(error) {
            response.status(400).send(JSON.stringify(error));
            return;
        }
        if(photos.length === 0) {
            console.log("Could not retrieve photos.");
            response.status(500).send("No photos found.");
            return;
        }

        var photosCopy = JSON.parse(JSON.stringify(photos));
        var mostRecentPhoto = photosCopy[0];
        for(var i = 1; i < photosCopy.length; i++){
            var photo = photosCopy[i];
            if(photo.date_time > mostRecentPhoto.date_time) {
                mostRecentPhoto = photo;
            }
        }
        if(mostRecentPhoto.permissions.length !== 0) {
            if(!mostRecentPhoto.permissions.includes(currUser)) {
                console.log("entered visibility case.");
                response.status(400).send("Unauthorized Access");
                return;
            }
        }

        var date = new Date(mostRecentPhoto.date_time);
        mostRecentPhoto.date_time = date.toUTCString();

        response.status(200).send(mostRecentPhoto);
    });
});

/* Get most commented photos*/
app.get('/mostCommentedPhoto/:userId', function(request, response){
    var currUser = request.session.user_id;
    var id = request.params.userId;

    Photo.find({'user_id': id}, function(error, photos){
        if(error) {
            response.status(400).send(JSON.stringify(error));
            return;
        }
        if(photos.length === 0) {
            console.log("Could not retrieve photos.");
            response.status(500).send("No photos found.");
            return;
        }
        var photosCopy = JSON.parse(JSON.stringify(photos));
        var numComments = photosCopy[0].comments.length;
        var mostCommented = photosCopy[0];
        for(var i = 1; i < photosCopy.length; i++) {
            var photo = photosCopy[i];
            if(photo.comments.length > numComments) {
                numComments = photo.comments.length;
                mostCommented = photo;
            }
        }
        if(mostCommented.permissions.length !== 0) {
            if(!mostCommented.permissions.includes(currUser)) {
                console.log("entered visibility case.");
                response.status(400).send("Unauthorized Access");
                return;
            }
        }

        var date = new Date(mostCommented.date_time);
        mostCommented.date_time = date.toUTCString();
        response.status(200).send({commentsCount: numComments, photo: mostCommented});
   });
});

/* Get user mentions */
app.get('/userMentions/:userId', function(request, response) {
    // console.log("IN USER MENTIONS");
    var currUser = request.session.user_id;

    var id = request.params.userId; //user id for which mentions are retrieved
    Photo.find({}, function(error, allPhotos){
        // console.log("PHOTO.FIND");

        if(error) {
            response.status(400).send(JSON.stringify(error));
            return;
        }
        if(allPhotos.length === 0) {
            console.log("Could not retrieve photos.");
            response.status(500).send("No photos found.");
            return;
        }

        var mentionedPhotoList = [];
        var photos = JSON.parse(JSON.stringify(allPhotos));
        // console.log(photos);
        async.each(photos, function(photo, doneCallback) {
            if(photo.mentions.includes(id)) {
                mentionedPhotoList.push(photo);
                doneCallback();
            }
            else {
                doneCallback();
            }
        }, function errorHandling(error) {
            if(error){
              console.log("error");
              response.status(400).send(JSON.stringify(error));
            }
            else{
              console.log("status 200", mentionedPhotoList);
              for(var i = 0; i < mentionedPhotoList.length; i++) {
                  var current = mentionedPhotoList[i];
                  if(current.permissions.length !== 0 && !current.permissions.includes(currUser)){
                      mentionedPhotoList.splice(i, 1);
                  }
              }
              return response.status(200).send(JSON.stringify(mentionedPhotoList));
            }
        });
    });
});

/*
 * URL /photosOfUser/:id - Return the Photos for User (id)
 */
app.get('/photosOfUser/:id', function (request, response) {

    if(!request.session.user_id) {
        response.status(401).send("Unauthorized access to list of users.");
        return;
    }

    var currUser = request.session.user_id;
    var id = request.params.id;

    Photo.find({'user_id': id}, 'file_name date_time user_id comments permissions', function(error, photos){
        if(error) {
            response.status(400).send(JSON.stringify(error));
            return;
        }
        if(photos.length === 0) {
            console.log("Could not retrieve photos.");
            response.status(500).send("No photos found.");
            return;
        }
        // create a copy of the photos to add parameters
        var unfiltered = JSON.parse(JSON.stringify(photos));
        var photoList = [];
        // console.log("UNFILTERED", unfiltered);
        for(var i = 0; i < unfiltered.length; i++) {
            var photo = unfiltered[i];
            var index;
            if(photo.permissions.length === 0){
                index = 0;
            } else {
                index = photo.permissions.indexOf(currUser);
            }
            if(index > -1){
                photoList.push(photo);
            }
        }

        async.each(photoList, function(photo, doneCallbackPhoto){
            var date = new Date(photo.date_time);
            photo.date_time = date.toUTCString();

            async.each(photo.comments, function(comment, doneCallbackComment){
                var user_id = comment.user_id;
                User.findOne({'_id':user_id}, '_id first_name last_name', function(error, user){
                    if(error) {
                        doneCallbackComment(error);
                        return;
                    }
                    if(user === null){
                        doneCallbackComment(error);
                        return;
                    }
                    delete comment.user_id;
                    comment.user = user;
                    var date = new Date(comment.date_time);
                    comment.date_time = date.toUTCString();
                    doneCallbackComment();
                });
            }, function(error){
                if(error){
                    console.log("Could not find photo");
                    doneCallbackPhoto(error);
                }
                doneCallbackPhoto();
            });
        }, function(error){
            if(error){
                response.status(400).send(JSON.stringify(error));
                return;
            }
            if(photoList.length === 0) {
                response.status(500).send("No photos for user");
                return;
            }
            return response.status(200).send(JSON.stringify(photoList));
        });
    });
});

/* For browser refresh EXTRA CREDIT. */
app.get('/session/loginInfo', function(request, response){
    var firstName = request.session.first_name;

    if(!firstName){
        console.log("No current session.");
        response.status(200).send({status: false});
        return;
    }

    console.log("User currently logged in!");
    response.status(200).send({name: firstName, status: true});
});

/* Register new user */
app.post('/user', function(request, response){
      var loginName = request.body.login_name;
      var password = request.body.password;
      var first_name = request.body.first_name;
      var last_name = request.body.last_name;
      var location = request.body.location;
      var description = request.body.description;
      var occupation = request.body.occupation;
      var lastActivity = request.body.lastActivity;

      if(loginName === '') {
          response.status(400).send("Invalid or missing login name");
          return;
      }
      if(password === '' || first_name === '' || last_name === ''){
          response.status(400).send("Password or name fields blank.");
          return;
      }

      User.findOne({login_name: loginName}, function(error, user){
          if(error) {
              response.status(400).send(error);
              return;
          }
          if(user) {
              response.status(400).send("This user already exists!");
              return;
          }

          var saltedPw = Password.makePasswordEntry(password);
          var newUser = {first_name: first_name,
                         last_name: last_name,
                         location: location,
                         occupation: occupation,
                         description: description,
                         login_name: loginName,
                         last_activity: lastActivity,
                         password_digest: saltedPw.hash,
                         salt: saltedPw.salt};

          var User = mongoose.model('User', User);
          User.create(newUser, function doneCallback(error, newUser){
              if(error){
                  response.status(400).send("Error in updating database.");
                  return;
              }
              response.status(200).send(newUser);
          });
      });
});

/* Login */
app.post('/admin/login', function(request, response){
    User.findOne({login_name: request.body.login_name}, function(error, user){
        if(error) {
            response.status(400).send(JSON.stringify(error));
            return;
        }
        if(!user) {
            response.status(400).send('User not found!');
            return;
        }

        if(!Password.doesPasswordMatch(user.password_digest, user.salt, request.body.password)) {
            response.status(400).send("Password incorrect.");
            return;
        }
        user.last_activity = "Logged in";
        user.save(function(error, userSave){
            console.log("Successfully updated user.");
        });

        request.session.user_id = user._id;
        request.session.login_name = user.login_name;
        request.session.password = user.password;
        request.session.first_name = user.first_name;
        response.status(200).send(JSON.stringify(user));
    });
});

/* Logout */
app.post('/admin/logout', function(request, response){

    if(!request.session){
        response.status(400).send("User not logged in!");
        return;
    }

    User.findOne({login_name: request.session.login_name}, function(error, user){
        if(error) {
            response.status(400).send(JSON.stringify(error));
            return;
        }
        if(!user) {
            response.status(400).send('User not found!');
            return;
        }
        user.last_activity = "Logged out";
        user.save(function(error, userSave){
            console.log("Updated activity");
        });
    });

    delete request.session.user_id;
    delete request.session.login_name;
    delete request.session.password;
    delete request.session.first_name;
    request.session.destroy(function(error){
        if(error) {
            response.status(400).send(JSON.stringify(error));
            return;
        }
        // console.log(request.session);
        response.status(200).send("Logging out.");
    });
});

app.post('/mentionsOfPhoto/:photo_id', function(request, response){
    var photoId = request.params.photo_id;
    var mentionsList = request.body.mentions;

    Photo.findOne({'_id': photoId}, function(error, photo){
        if(error) {
            console.log("Entered ERROR");
            response.status(400).send(error);
            return;
        }
        if(!photo) {
            console.log("Entered !photo");
            response.status(500).send("Could not find photo with " + photoId);
            return;
        }
        if(mentionsList.length === 0) {
            console.log("No mentions");
            response.status(200).send("No mentions found!");
            return;
        }

        for(var i = 0; i < mentionsList.length; i++){
            photo.mentions.push(mentionsList[i]);
        }

        console.log("After push: ", photo.mentions);

        photo.save(function(error, photo){
            console.log(photo);
            response.status(200).send(photo);
        });
    });
});

app.post('/commentsOfPhoto/:photo_id', function(request, response){
    console.log("Posting comment.");
    var photoId = request.params.photo_id;
    var comment_text = request.body.comment;
    var userId = request.session.user_id;
    var loginName = request.session.login_name;

    var newCommentObj = {};
    Photo.findOne({'_id': photoId}, function(error, photo){
        if(error) {
            console.log("Entered ERROR");
            response.status(400).send(error);
            return;
        }
        if(!photo) {
            console.log("Entered !photo");
            response.status(500).send("Could not find photo with " + photoId);
            return;
        }
        if(!comment_text) {
            console.log("Entered no comment_text");
            response.status(500).send("Entered empty comment.");
            return;
        }
        newCommentObj.comment = comment_text;
        newCommentObj.date_time = Date.now();
        newCommentObj.user_id = userId;

        photo.comments.push(newCommentObj);

        User.findOne({login_name: loginName}, function(error, user){
            if(error) {
                response.status(400).send(JSON.stringify(error));
                return;
            }
            if(!user) {
                response.status(400).send('User not found!');
                return;
            }
            user.last_activity = "Posted Comment";
            user.save(function(error, userSave){
                console.log("Updated activity");
            });
        });

        photo.save(function(error, photoSave){
            console.log(error);
            console.log(photoSave.comments);
            response.status(200).send(newCommentObj);
        });
    });
});

app.post('/photos/new', function(request, response){
    console.log("Posting photo ...");
    var userId = request.session.user_id;
    var loginName = request.session.login_name;

    processFormBody(request, response, function (err) {
         if (err || !request.file) {
            response.status(400).send(JSON.stringify(err));
            return;
         }
         console.log("PERMISSIONS", request.body.permissions);
         // request.file has the following properties of interest
         //      fieldname      - Should be 'uploadedphoto' since that is what we sent
         //      originalname:  - The name of the file the user uploaded
         //      mimetype:      - The mimetype of the image (e.g. 'image/jpeg',  'image/png')
         //      buffer:        - A node Buffer containing the contents of the file
         //      size:          - The size of the file in bytes

         // XXX - Do some validation here.
         // We need to create the file in the directory "images" under an unique name. We make
         // the original file name unique by adding a unique prefix with a timestamp.
         if(request.file.fieldname !== "uploadedphoto") {
            response.status(500).send("Incorrect photo format.");
            return;
         }
         if(request.file.originalname === undefined) {
            response.status(500).send("File does not have a name.");
            return;
         }
         if(request.file.mimetype !== "image/jpeg" && request.file.mimetype !== "image/png" && request.file.mimetype !== "image/jpg"){
            response.status(500).send("Cannot support this type of image file.");
            return;
         }
         if(!request.file.buffer) {
            response.status(500).send("No buffer.");
            return;
         }
         if(!request.file.size) {
            response.status(500).send("No size");
            return;
         }

         var timestamp = new Date().valueOf();
         var filename = 'U' +  String(timestamp) + request.file.originalname;
         var permissionsList = JSON.parse(request.body.permissions);

         fs.writeFile("./images/" + filename, request.file.buffer, function (err) {
             // XXX - Once you have the file written into your images directory under the name
             // filename you can create the Photo object in the database
             var newPhoto = {file_name: filename,
                             user_id: userId,
                             comments: []};

             if(permissionsList.length !== 0) {
                newPhoto.permissions = permissionsList;
             }
             else {
                newPhoto.permissions = [];
             }

             var Photo = mongoose.model('Photo', Photo);
             Photo.create(newPhoto, function(error, newphoto){
                if(!error){
                    console.log("Database updated with photo.");
                    User.findOne({login_name: loginName}, function(error, user){
                        user.last_activity = "Uploaded Photo";
                        user.last_photo = newPhoto.file_name;
                        user.save(function(error, userSave){
                            console.log("Saved user activity");
                            console.log(user);
                        });
                    });
                    response.status(200).send(newphoto);
                }
             });
         });
    });
});

var server = app.listen(3000, function () {
    var port = server.address().port;
    console.log('Listening at http://localhost:' + port + ' exporting the directory ' + __dirname);
});
