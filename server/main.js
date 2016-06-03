Postings = new Mongo.Collection('postings');
Rentstuff_Users = new Mongo.Collection('rentstuff_users');
Messages = new Mongo.Collection('messages');
Conversations = new Mongo.Collection('conversations');

//Publish usernames
Meteor.publish('users', function(){
	return Meteor.users.find({}, {fields:{username: true}});
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

