Postings = new Mongo.Collection('postings');
Rentstuff_Users = new Mongo.Collection('rentstuff_users');
Messages = new Mongo.Collection('messages');
Conversations = new Mongo.Collection('conversations');

//Publish usernames
Meteor.publish('users', function(){
	return Meteor.users.find({}, {fields:{username: true}});
});

//Publish postings
Meteor.publish('thePostings', function(){
  return Postings.find();
});
//Publish Rentstuff_Users
Meteor.publish('theUsers', function(){
  return Rentstuff_Users.find();
});
//Publish conversations
Meteor.publish('theConversations', function(){
  //get username
  if(this.userId){
    var username = Meteor.users.findOne(this.userId).username;
    //return conversations where username is asker or lender
    return Conversations.find(
                            {$or: [{asker: username},
                                  {lender: username}
                             ]});
  }
});
//Publish messages
Meteor.publish('theMessages', function(){
  //get username
  if(this.userId){
    var username = Meteor.users.findOne(this.userId).username;
    //find conversations where username is asker or lender
    conversations = Conversations.find(
                            {$or: [{asker: username},
                                  {lender: username}
                             ]});
    //map conversationIds from conversation objects and put in array
    var conversationIdsArray = conversations.map(function(obj){
        return obj._id
      }); 
    //return messages with conversationId's contained in conversationIdsArray
    return Messages.find({conversationId: {$in: conversationIdsArray}})
  }
});


//Image Upload

Cloudinary.config({
	cloud_name: 'gordonseto',
	api_key: '594548983263644',
	api_secret: 'lEYgImGmT-dQLvz5ixtGZWRfsLg'
});

//Search box
SearchSource.defineSource('postings', function(searchText, options) {
  var options = {sort: {createdAt: -1}};

  if(searchText) {
    var regExp = buildRegExp(searchText);
    var selector = {title: regExp};

    return Postings.find(selector, options).fetch();
  } else {
    return Postings.find({}, options).fetch();
  }
});

function buildRegExp(searchText) {
  var words = searchText.trim().split(/[ \-\:]+/);
  var exps = _.map(words, function(word) {
    return "(?=.*" + word + ")";
  });
  var fullExp = exps.join('') + ".+";
  return new RegExp(fullExp, "i");
}






