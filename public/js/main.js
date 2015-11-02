//Parse.initialize("APPLICATION_ID", "JAVASCRIPT_KEY");
Parse.initialize("tm4OiR7E8zVPm6IJvlAclFxfUdWct3QyidSmveDQ", "4dMCCtPUjmpacMw0JCKqhrucl9lyG4FngHkUdaCB");

var app = angular.module('Improveise', []);
//.filter('to_trusted', ['$sce', function($sce){
//    return function(text) {
//        return $sce.trustAsHtml(text);
//    }]);

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

///////////////////////////////////////////////////////////////////////////////////
var threshold_good = 1;

app.controller("MainCtrl", function($scope, $interval) {
    //$scope.messages = { 1: { username: "undead", userid: "", msg: "Yo", votes: 0 } };
    $scope.messages = [ { username: "undead", userId: "", msg: "Yo", votes: 0, votesTot: 0 } ];
    $scope.acceptedMsgs = [ "This is a good day to die" ];
    $scope.username = "";
    $scope.userId = "";
    $scope.numStabs = 0;
    $scope.curScore = 0;
    $scope.curJudgePoints = 0;
    $scope.systemId = "__system__";
    $scope.roundTimeMax = 300; //500;
    $scope.roundTime = $scope.roundTimeMax;
    $scope.phaseNo = 0; //0: act, 1: judgement, 2: ended

    $scope.convoIdx = Date.now();

    $scope.timeMaxForReply = 150;
    $scope.timeLeftForAction = $scope.timeMaxForReply;
    $scope.replyingTo = {};

    $scope.numStabsThreshold = 3;
    $scope.gameover = false;
    $scope.roundfinished = false;

    socket.on('join round', function(userid){
        $scope.userId = userid;
        $scope.phaseNo = 0; //start phase0: act
        $scope.$apply();
    });
    socket.on('new participant', function(username){
        $scope.messages.push({
            userId: $scope.systemId,
            msg: "< A New sailor has risen from the depths: " + username + " >"
        });
        $scope.$apply();
    });
    socket.on('user died', function(username){
        $scope.messages.push({
            userId: $scope.systemId,
            msg: "< Sailor: "+ username + " has been killed by the Kraken >"
        });
        $scope.$apply();
    });
    socket.on('chat message', function(msgObj){
        $scope.messages.push(msgObj);
        $scope.$apply();
        //scroll to bottom
        var objDiv = document.getElementById("messages");
        objDiv.scrollTop = 1000000; //objDiv.scrollHeight;
    });

    $scope.joinRound = function() {
        if (  $scope.username == "" )
        {
            alert("Enter a stage name!");
            return;
        }
        socket.emit('join round', $scope.username);
    };
    //send message
    $scope.sendMsg = function() {
        //alert("asdf");
        var msgText = $('#user_msg').val();
        socket.emit('chat message', {
            username: $scope.username,
            userId: $scope.userId,
            //msg: $scope.replyingTo.username === undefined ? msgText : +"<b>"+msgText+"</b>" + " (to: "+$scope.replyingTo.username+") ",
            msg: $scope.replyingTo.username === undefined ? msgText : msgText + " (to: "+$scope.replyingTo.username+") ",
            votes: 0, //overall + / -
            votesTot: [],
            replyingToIdx: $scope.replyingTo == "" ? -1 : $scope.replyingTo.msgIdx
        });
        $('#user_msg').val('');
        $scope.curScore += 10;
        $scope.resetTimer();
        if ( $scope.replyingTo.username != "" )
            $scope.curScore += 50;
        $scope.replyingTo = {};
        return false;
    };

    //[ VOTING ]
    $scope.voteUp = function( angularMsgObj ) {
        console.log("voteUp");
        //angularMsgObj.votes = angularMsgObj.votes+1;
        //$scope.saveDialogueIfPossible( angularMsgObj );
        socket.emit('upVote', {
            judgerUserId: $scope.userId,
            judgedMsg: angularMsgObj
        });
        $scope.curJudgePoints += 50;
    };
    $scope.voteDown = function( angularMsgObj ) {
        //angularMsgObj.votes = angularMsgObj.votes-1;
        socket.emit('downVote', {
            judgerUserId: $scope.userId,
            judgedMsg: angularMsgObj
        });
        $scope.curJudgePoints += 50;
    };
    socket.on('upVote', function( rel_info ){
        var msg = $scope.getMsgWithIdx( rel_info.judgedMsg.msgIdx);
        //console.log(msg);
        //console.log("my id:" + $scope.userId);
        msg.votes++;
        $scope.pushVote( msg, {
            voterId: rel_info.judgerUserId,
            voted: 1
        });
        var mine = $scope.getMyVote( msg );
        //console.log(mine);
        if ( msg.userId == $scope.userId )
        {
            $scope.curScore += 10;
        }
        $scope.$apply();
    });
    socket.on('downVote', function(rel_info){
        var msg = $scope.getMsgWithIdx( rel_info.judgedMsg.msgIdx);
        msg.votes--;
        $scope.pushVote( msg, {
            voterId: rel_info.judgerUserId,
            voted: -1
        });
        if ( msg.userId == $scope.userId )
        {
            alert("You have been stabbed!");
            $scope.numStabs += 1;
            $scope.checkGameover();
        }
        $scope.$apply();
    });
    //make sure 1 user can only make 1 vote for each message
    $scope.pushVote = function( msg, voteObj )
    {
        if ( msg.votesTot )
        {
            var found = false;
            msg.votesTot.forEach(function( vote ) {
                if ( vote.voterId == voteObj.voterId )
                {
                    vote.voted = voteObj.voted;
                    found = true;
                }
            });
            if ( !found )
                msg.votesTot.push(voteObj);
        }
    };
    //get user vote for a message
    $scope.getMyVote = function(msgObj)
    {
        var voted = 0;
        if ( msgObj.votesTot )
        {
            msgObj.votesTot.forEach(function( vote ) {
                if ( vote.voterId == $scope.userId )
                {
                    voted = vote.voted;
                }
            });
        }
        return voted;
    };
    //[REPLYING]
    $scope.replyTarget = function( msgObj )
    {
        $scope.replyingTo = {};
        angular.copy(msgObj, $scope.replyingTo);
        $scope.$apply();
    };

    //[ HELPERS ]
    //get message with idx
    $scope.getMsgWithIdx = function( msgIdx )
    {
        for ( var i = 0; i < $scope.messages.length; ++i )
        {
            if ( $scope.messages[i].msgIdx == msgIdx )
                return $scope.messages[i];
        }
    };
    $scope.decreaseTime = function()
    {
        if ( $scope.userId == "" || $scope.phaseNo >= 2 || $scope.gameover ) {
            //console.log("asdf");
            return;
        }
        //stage: acting
        if ( $scope.phaseNo == 0 )
        {
            $scope.timeLeftForAction = ($scope.timeLeftForAction-0.1).toFixed(2);
            if ( $scope.timeLeftForAction <= 0 )
            {
                $scope.numStabs += 1;
                $scope.resetTimer();
                $scope.checkGameover();
            }
        }
        //time up
        if ( $scope.roundTime <= 0)
        {
            ++$scope.phaseNo;
            //stage: start judgement time
            if ( $scope.phaseNo == 1 )
                $scope.roundTime = 60;
        }
        //stage: finished
        if ( $scope.phaseNo == 2 )
        {
            $scope.finishGame();
        }
        $scope.roundTime = Math.max(0, ($scope.roundTime-0.1)).toFixed(2);
    };
    $scope.resetTimer = function()
    {
        $scope.timeLeftForAction = $scope.timeMaxForReply;
    };
    var timer = $interval( $scope.decreaseTime, 100 );
    $scope.checkGameover = function()
    {
        if ( !$scope.gameover && $scope.numStabs >= $scope.numStabsThreshold )
        {
            socket.emit('user died', {
                userId: $scope.userId,
                username: $scope.username
            });
            $scope.gameover = true;
        }
    };
    $scope.finishGame = function()
    {
        $scope.messages.push({
            userId: $scope.systemId,
            msg: "< Round Fin! Sailor ("+ $scope.username + ") lands a final blow to the Kraken, sinking it to the depths of the sea >"
        });
        $scope.roundfinished = true;

        //filter only good dialogue (acceptedMsgs)
        $scope.reduceToOnlyGoodDialogue();

        //calculate user justice points
        var numUserAlignedVotes = $scope.getActualJudgementPoints();

        //save conversation in db
        $scope.saveDialogueIfPossibleAll();

        $scope.messages.push({
            userId: $scope.systemId,
            msg: "< Final Points: " +$scope.curScore+ " Judgement Points: " + numUserAlignedVotes*50 +"/"+$scope.curJudgePoints +" >"
        });
        $scope.messages.push({
            userId: $scope.systemId,
            msg: "< Voting alignment: " +numUserAlignedVotes +"/" +$scope.getUsersDialogueCount( $scope.userId ) +" >"
        });
        var objDiv = document.getElementById("messages");
        objDiv.scrollTop = 1000000; //objDiv.scrollHeight;
    };

    ///////////////////////////////////////////////////////////////////////
    $scope.getActualJudgementPoints = function()
    {
        var userVote = 0;
        var userVotesThatAlignWithMajority = 0;
        $scope.messages.forEach(function(msgObj) {
            var userVote = $scope.getMyVote( msgObj );
            var majorityVote = 0;
            var majorityVoteCount = 0;
            var votes = {};
            if ( userVote != 0 )
            {
                //get count of each vote
                msgObj.votesTot.forEach(function(msg) {
                    if ( votes.hasOwnProperty( msg.voted ) )
                        votes[msg.voted]++;
                    else
                        votes[msg.voted] = 0;
                });
                //loop over each vote(0/1/-1)
                for (var voteType in votes) {
                    if (votes.hasOwnProperty(voteType)) {
                        if ( votes[voteType] >= majorityVoteCount )
                        {
                            majorityVoteCount = votes[voteType];
                            majorityVote = voteType;
                        }
                    }
                }
                //check if majority vote aligns with user vote
                if ( majorityVote == userVote )
                    ++userVotesThatAlignWithMajority;
            }
        });
        //Note: user doesn't know how many votes he aligned with until end
        console.log("user aligned votes:"+userVotesThatAlignWithMajority+"/"+$scope.getUsersDialogueCount( $scope.userId ));
        return userVotesThatAlignWithMajority;
    };
    $scope.getUsersDialogueCount = function( excludeId )
    {
        var count = 0;
        $scope.messages.forEach(function(msgObj) {
            if ( msgObj.userId != $scope.systemId && msgObj.userId != excludeId )
                ++count;
        });
        return count;
    };
    //reduce to only good dialogue
    $scope.reduceToOnlyGoodDialogue = function()
    {
        $scope.messages.forEach(function(msgObj) {
            if ( msgObj.votes > 0 && msgObj.userId != $scope.systemId )
                $scope.acceptedMsgs.push(msgObj);
        });
    };
    //save dialogue in db
    $scope.saveDialogueIfPossibleAll = function()
    {
        console.log("saving all good dialogue. length:" + $scope.acceptedMsgs.length);
        $scope.acceptedMsgs.forEach(function(msgObj) {
            $scope.saveDialogueIfPossible( msgObj );
        });
    };
    $scope.saveDialogueIfPossible = function( angularMsgObj )
    {
        //if ( angularMsgObj.votes >= threshold_good )
        {
            console.log("saving...! ");
            var msgObjSend = createMsgObject( $scope.convoIdx, angularMsgObj );
            console.log(msgObjSend);
            dialogueObject.save( msgObjSend, {
                success: function(object) {
                    console.log(object);
                    $scope.queryAllDialogue();
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

var createMsgObject = function( convoIdx, angularMsgObj )
{
    return {
        convoIdx: convoIdx,
        username: angularMsgObj.username,
        userId: angularMsgObj.userId,
        msg: angularMsgObj.msg,
        votes: angularMsgObj.votes,
        msgIdx: angularMsgObj.msgIdx,
        replyingToIdx: angularMsgObj.replyingToIdx ? angularMsgObj.replyingToIdx : ""
    };
};
