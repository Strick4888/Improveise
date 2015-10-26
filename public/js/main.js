//Parse.initialize("APPLICATION_ID", "JAVASCRIPT_KEY");
Parse.initialize("tm4OiR7E8zVPm6IJvlAclFxfUdWct3QyidSmveDQ", "4dMCCtPUjmpacMw0JCKqhrucl9lyG4FngHkUdaCB");

var app = angular.module('Improveise', []);

var DialogueObject = Parse.Object.extend("Dialogue");
var dialogueObject = new DialogueObject();
var queryObject = new Parse.Query(DialogueObject);

//dialogueObject.save({foo: "bar"}, {
//    success: function(object) {
//        //$(".success").show();
//    },
//    error: function(model, error) {
//        //$(".error").show();
//    }
//});

///////////////////////////////////////////////////////////////////////////////////

var socket = io(); //initialise socket.io
var sendMsg = function() {
    //alert("asdf");
    socket.emit('chat message', {
        username: $('#user_id').val(),
        msg: $('#user_msg').val(),
        votes: 0
    });
    $('#user_msg').val('');
    return false;
};

///////////////////////////////////////////////////////////////////////////////////
var threshold_good = 3;

app.controller("MainCtrl", function($scope, $interval) {
    $scope.messages = [ { username: "undead", msg: "Yo", votes: 0 } ];
    $scope.acceptedMsgs = [ "This is a good day to die" ];

    socket.on('chat message', function(msgObj){
        //$('#messages').append($('<li>').text(msg));
        //alert("received");
        msgObj.idx = $scope.messages.length;
        $scope.messages.push(msgObj);
        $scope.$apply();
    });

    $scope.voteUp = function( msgObj ) {
        msgObj.votes = msgObj.votes+1;
        if ( msgObj.votes >= threshold_good )
        {
            console.log("saving...! ");
            //console.log(msg);
            var msgObjSend ={
                username: msgObj.username,
                msg: msgObj.msg,
                votes: msgObj.votes
            };
            console.log(msgObjSend);
            //$scope.acceptedMsgs.push( msg );
            dialogueObject.save( msgObjSend,
                //{ foo: "123123" },
                {
                success: function(object) {
                    console.log(object);
                    $scope.queryAllDialogue();
                    //pull all
                },
                error: function(model, error) {
                    console.log(error);
                }
            })
        }
    };

    $scope.queryAllDialogue = function() {
        console.log("querying....!");
        $scope.acceptedMsgs = [ "This is a good day to die" ];
        queryObject.find({
            success: function (results) {
                console.log("results found!");
                console.log(results);
                for ( var i = 0; i < results.length; ++i ) {
                    $scope.acceptedMsgs.push( results[i] );
                }
                $scope.$apply();
            },
            error: function (error) {
                alert("Error:"+error.code+" "+error.message);
            }
        });
    }
});
