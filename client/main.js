/*
	meteor add accounts-ui						for accounts
	meteor add accounts-password
	meteor add iron:router 						for routing
	meteor add themeteorchef:jquery-validation 	for validator
	meteor add lepozepo:cloudinary 				for image upload
	npm install -g meteorite			windows only, add meteorite
	meteor add mrt:jquery-ui					add jquery-ui
	meteor add twbs:bootstrap					for bootstrap 3
	meteor add rajit:bootstrap3-datepicker 		for calendar
	meteor add meteorhacks:search-source		for searchbox
	meteor add dburles:google-maps				for maps
	meteor add doctorpangloss:filter-collections for filters
	meteor add ejson							extended json
	meteor add check 							for checking
*/	


Postings = new Mongo.Collection('postings');
Rentstuff_Users = new Mongo.Collection('rentstuff_users');
Messages = new Mongo.Collection('messages');
Conversations = new Mongo.Collection('conversations');

//Client-Only Collection
Temporary_Markers = new Mongo.Collection(null);

const recordsPerPage = 12;

//Search box
var options = {
	keepHistory: 1000*60*5,
	localSearch: true
};
var fields = ['title', 'description', 'location', 'rentalrate'];

PostingsSearch = new SearchSource('postings', fields, options);

//Maps function
Meteor.startup(function() {
	GoogleMaps.load();
});

//Subscribe to usernames
Meteor.subscribe("users");

Router.configure({
	layoutTemplate: 'ApplicationLayout'
});

Router.route('/',{
	name: 'home',
	template: 'home'
});

Router.route('/s/:city/:page?', {
	name: 'search',
	template: 'search',
	data: function(){
		//get location from url
		var location = this.params.city;
		//set locationFilter for uses later
		Session.set('locationFilter', location);
	}
});

Router.route('/register',{
	name: 'register'
});

Router.route('/login',{
	name: 'login'
})

Router.route('/posting/:postingId/confirm',function(){
	this.render('confirm', {
		data: {
			postingId: this.params.postingId
			},
		});
	},{
		name: 'confirm'
});

Router.route('/posting/:_id/edit',{
	name: 'edit',
	template: 'edit',
	data: function(){
		//retrieve current posting id,
		var currentPosting = this.params._id;
		//return posting info
		return Postings.findOne({_id: currentPosting});
		}
	});

Router.route('/success', {
	name: 'success'
});

Router.route('/lend',{
	name: 'newPosting',
	onAfterAction: function(){
		if(!Meteor.userId()){	
		//if not a user, redirect to login
			Router.go('/login/');
		}
	}
});

//onStop hook is executed whenever we LEAVE a route
Router.onStop(function(){
	//register the previous route location in a session variable
	Session.set("previousLocationPath", Router.current().url);
	//remove all markers
	Temporary_Markers.remove({});
});


Router.route('/posting/:_id',{
	name: 'posting',
	template: 'posting',
	data: function(){		//retrieves current posting id,
		var currentPosting = this.params._id; //returns posting info
		return Postings.findOne({_id: currentPosting});
		}
	});

Router.route('/profile/:createdBy', function(){
	this.render('profile', {
		data: {
			username: this.params.createdBy
			},
		});
	},{
		name: 'profile'
});

Router.route('/messages', {
	name: 'messenger',
	template: 'messenger'
});

	Template.navigation.helpers({
		'loggedinUser': function(){
			//shows users username on navigation bar
			return Meteor.user().username;
		},
		city: function(){
			return Session.get('locationFilter');
		}
	});

	Template.navigation.events({
		'click .logout': function(event){
			Meteor.logout();
			//refresh the page
			document.location.reload(true);
		},
		'submit': function(event, template){
			event.preventDefault();
			//searches new location when entered by user
			var location = $('#location').val();
			if(location){
				location = location.toLowerCase();
				Router.go('/s/'+location);
			}
		}
	});

	Template.home.events({
		'submit': function(){
			event.preventDefault();
			//get location value from searchbar
			var location = $('#location').val();
			location = location.toLowerCase();
			//go to search url with location
			Router.go('/s/'+location);
		}
	})

	Template.displayPostings.helpers({
		'posting': function(){
			return Postings.find({}, {sort: {createdAt: -1}});
		},
		'timedifference': function(){

			postedDate = this.createdAt;
			currentDate = new Date();

			return getTimeDifference(postedDate, currentDate);
		}
	});

const DEFAULT_MARKER = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|FE7569' 
const GREEN_MARKER = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|009999';

	Template.filter.onCreated(function() {
		//Set filters table to null
		Session.set('categoryFilter', null);
  		// We can use the `ready` callback to interact with the map API once the map is ready.
  		GoogleMaps.ready('map', function(map) {
    		// Add markers to the map once it's ready from
    		//temporary_markers collection
    		var ZIndex = 1;
    		var markers = {};
    		var openwindow = null;
    		//add listener to close infowindows
    		google.maps.event.addListener(map.instance, 'click', function(){
    			if(openwindow){
    				openwindow.close();
    			}
    		});

    		Temporary_Markers.find().observe({
    		//observe the Temporary_Markers collection
    			added: function(document){
    				//if added, add a new marker
    				var marker = new google.maps.Marker({
    					position: new google.maps.LatLng(document.lat, document.lng),
    					map: map.instance,
    					icon: document.color,
    					id: document._id,
    					zIndex: ++ZIndex
    				});
					//add an infowindow to the marker
					postingId = document.postingId;
					var infowindow = new google.maps.InfoWindow({
						content: infoWindowContent(postingId)
					});
					//add listeners for hovering and click
					google.maps.event.addListener(marker, 'click', function(){
						if(openwindow){ //if previously opened window, close
							openwindow.close();
						}
						infowindow.open(map.instance, marker);
						openwindow = infowindow;
					});			
  					//change colour when mouseover
  					google.maps.event.addListener(marker, 'mouseover', function(){
  						marker.setIcon(GREEN_MARKER);
  						//set ZIndex to the highest ZIndex
  						marker.setZIndex(++ZIndex);
  						infowindow.setZIndex(ZIndex)
  						if(openwindow){
  							openwindow.close();
  						}
  						infowindow.open(map.instance, marker);
  						openwindow = infowindow;
  					});
  					//change colour back when mouseout
  					google.maps.event.addListener(marker, 'mouseout', function(){
  						marker.setIcon(DEFAULT_MARKER);
  					})

    				markers[document._id] = marker;
    			},
    			changed: function(document){
    				//changes when posting is hovered over
    				markers[document._id].setIcon(document.color);
    				markers[document._id].setZIndex(++ZIndex);
    			},
    			removed: function(oldDocument){
    				//Remove the marker from the map
    				markers[oldDocument._id].setMap(null);
    				//clear the event listener
    				google.maps.event.clearInstanceListeners(
    					markers[oldDocument._id]); 
    				//remove the reference to this marker instance
    				delete markers[oldDocument._id];   			
    			}
    		});

    	});
  	});

function infoWindowContent(postingId){
	posting = Postings.findOne({_id: postingId});
	if(posting.postingImages[0]){	//check if image
	contentString = '<div class="posting_container">'+
					'<a href="/posting/'+posting._id+'">'+
					'<span class="map_postPreview">'+
					'<div class="map_posting_image">'+
					'<img src="'+posting.postingImages[0]+'">'+
					'</div>'+
					'<div class="map_posting_title">'+posting.title+'</div>'+
					'<div class="map_posting_rate">$'+posting.rentalrate+' /day</div>'+
					'</span>'+
					'</a>'+
					'</div>';
	}else {
	contentString = '<div class="posting_container">'+
					'<a href="/posting/'+posting._id+'">'+
					'<span class="map_postPreview">'+
					'<div class="map_posting_image">'+
					'<img>'+
					'</div>'+
					'<div class="map_posting_title">'+posting.title+'</div>'+
					'<div class="map_posting_rate">$'+posting.rentalrate+' /day</div>'+					'</span>'+
					'</a>'+
					'</div>';
	}
	return contentString;
}

	Template.filter.helpers({
		mapOptions: function(){
			if (GoogleMaps.loaded()){
			//get location from locationFilter
			var location = Session.get('locationFilter');
			//search the address, callback sets center of map
			//to location returned from function
			searchAddress(location, function(geocode_address){
				GoogleMaps.maps.map.instance.setCenter(geocode_address);
				Session.set('geocode_address', geocode_address);
				});
				map = {
					center: new google.maps.LatLng(51.0486151, -114.0708459),
					zoom: 11,
				};
				return map;
			}
		},
		results: function(){
			//get current page from url
			var currentPage = parseInt(Router.current().params.page) || 1;
			//get skip count from current page
			var skipCount = (currentPage - 1) * recordsPerPage;
			//check skipCount for positive integer
			var positiveIntegerCheck = Match.Where(function(x){
				check(x, Match.Integer);
				return x >= 0;
			});
			check(skipCount, positiveIntegerCheck);

			//get geocoded center of map
			center = Session.get('geocode_address');
			if(center){
				//return postings max 50km away from center
				categoriesArray = Session.get('categoryFilter');
				//if categories array has values, return postings
				if(categoriesArray == null || categoriesArray.length == 0){
					categoriesArray = ["snow", "water", "sport",
										"play", "utility"];
				}
				//get total count of results 
				var count = Postings.find({
					category: {$in: categoriesArray},
					'geocode_address':
						{$near:
							{$geometry:
								{type: "Point",
									coordinates: [center.lat, 
												center.lng]
								},
								$maxDistance: 50000
							}
						}	
					}).count();
				//set session
				Session.set('resultsCount', count);

				return Postings.find({
					category: {$in: categoriesArray},
					'geocode_address':
						{$near:
							{$geometry:
								{type: "Point",
									coordinates: [center.lat, 
												center.lng]
								},
								$maxDistance: 50000
							}
						}	
					},
					{
						sort: {createdAt: -1},
						limit: recordsPerPage,
						skip: skipCount
					}
				);					 
			}
		},
		posting_marker: function(){
			//Insert marker into collection
			if(this.geocode_address){
				if(this.geocode_address.coordinates){
				postingId = this._id;
				Temporary_Markers.insert({lat: this.geocode_address.coordinates[0], 
									lng: this.geocode_address.coordinates[1], 
									postingId: postingId,
									color: DEFAULT_MARKER});    				
    				}
    			}
    	},
		city: function(){
			return Session.get('locationFilter');
    	},
		'timedifference': function(){

			postedDate = this.createdAt;
			currentDate = new Date();

			return getTimeDifference(postedDate, currentDate);
		},
		prevPage: function(){
			//get current page
			var currentPage = parseInt(Router.current().params.page) || 1;
			//get current city
			var currentCity = Router.current().params.city;
			if(currentPage === 1){
				//if current page is 1, no button
				return false;
			}
			else{
				previousPage = currentPage - 1;
			return '/s/'+currentCity+'/'+previousPage;
			}
		},
		nextPage: function(){
			//get current page
			var currentPage = parseInt(Router.current().params.page) || 1;
			//get current city
			var currentCity = Router.current().params.city;
			//get total count of records
			var count = Session.get('resultsCount');
			//if there are more records to be returned, add one to next page
			if(currentPage * recordsPerPage < count){
				var nextPage = currentPage + 1;
				return '/s/'+currentCity+'/'+nextPage;
			}
			else {
			//else no button
				return false;
			}	
		},
		maxPage: function(){
			var currentCity = Router.current().params.city;
			var count = Session.get('resultsCount');
			maxPage = count/recordsPerPage;
			maxPage = Math.ceil(maxPage);
			return '/s/'+currentCity+'/'+maxPage;
		},
		numPage: function(){
			var count = Session.get('resultsCount');
			maxPage = count/recordsPerPage;
			maxPage = Math.ceil(maxPage);
			var numPages = [];
			for(i = 1; i <= maxPage; i++){
				numPages.push(i);
			}
			return numPages;
		},
		currentPage: function(){
			var currentPage = parseInt(Router.current().params.page) || 1;
			if(currentPage == this){
				return 'currentPage';
			}
			else{
				return '';
			}
		}
	});

var timer;
var doLoop = false;

	Template.filter.events({
		'click .maptoggle': function(){
			//get element from the DOM
			map_container = $('.map-container');

			if(map_container.is(":visible")){
			//if the map was visible before click, set button to "Map"
				$('#maptoggle').val("Map");
			} else{
			//if the map was hidden, set button to "Hide Map"
				$('#maptoggle').val("Hide Map");
			}
			//toggle map
			$('.map-container').toggle();
		},
		'click .filterstoggle': function(){
			//get element from the DOM
			filters_container = $('.filters-container');
			
			if(filters_container.is(":visible")){
				//if filter was visible before click, slide up
				filters_container.slideUp(300);
				if(Session.get('categoryFilter')){
					//remove markers from map
					Temporary_Markers.remove({});
					//set category filter to null
					Session.set('categoryFilter', null);
				}
				//change button value
				$('#filterstoggle').val("filters");
				//unbold text
				listelement = $('td');
				for(i = 0; i < listelement.length; i++){
					listelement[i].style.fontWeight = "";
				}
			} else{	
				//if showing, change value of button
				filters_container.slideDown(300);
				$('#filterstoggle').val("filters X");
			}
		},
		'click .posting_container a': function(event){
			event.preventDefault();
			//opens new tab when clicking posting_previews
			window.open(event.currentTarget.href);
		},	
		//mouseenter, change color to green
		'mouseenter .posting_container': function(event, template){
			Temporary_Markers.update({postingId: this._id}, {$set: {color: GREEN_MARKER}});
		},
		//mouseleave, change color back to default
		'mouseleave .posting_container': function(event, template){
			Temporary_Markers.update({postingId: this._id}, {$set: {color: DEFAULT_MARKER}});
		}, 
		//filters table events
		'click #filters_table td': function(event){
			//remove markers from map
			Temporary_Markers.remove({});
			//get category that was clicked
			clickedCategory = event.currentTarget.innerHTML.toLowerCase();
			//get current category array
			categoriesArray = Session.get('categoryFilter');
			if(categoriesArray){
				//check if selected td is already in the array
				foundindex = categoriesArray.indexOf(clickedCategory);
				if(foundindex == -1){
				//if -1, clickedCategory is not in array, bold text and push to array
				event.currentTarget.style.fontWeight = "bold";
				categoriesArray.push(clickedCategory);
				//set pages filter category
				Session.set('categoryFilter', categoriesArray);
				} else{	//clickedCategory is in the array, remove from array and unbold
					//remove from array
					categoriesArray.splice(foundindex, 1);
					//unbold
					event.currentTarget.style.fontWeight = "";
					if(categoriesArray == null || categoriesArray.length == 0){	
						//if null, take off all category filters
						categoriesArray == null;
						Session.set('categoryFilter', categoriesArray);
					} else {
						//set pages filter to new category array
						Session.set('categoryFilter', categoriesArray);						
					}
				}
			} else{ //categoriesArray does not exist
				categoriesArray = [clickedCategory];
				event.currentTarget.style.fontWeight = "bold";			
				Session.set('categoryFilter', categoriesArray);
			} 
		},
		'mouseenter .posting_image': function(event){
			//get posting _id
			postingId = this._id;
			//get posting
			posting = Postings.findOne({_id: postingId});
			//get posting images array
			postingImages = posting.postingImages;
			//get image container
			image = event.currentTarget.children[0];
			//initialize animation
			var i = 0;
			doLoop = true;
			animate();

			// Start animation
			function animate() {
				if(doLoop === true){
					//recursively loop through postingImages
					//with timeout of 750ms
					if(postingImages[i]){
    					image.src = postingImages[i];
    				}
    				i++;

    				if (i >= postingImages.length){
    					//if reach end of postingImages,
    					//start loop again
        				i = 0;
    				}

    				timer = setTimeout(animate, 750);
				}
			}
		},
		'mouseleave .posting_image': function(event){
			//stop loop
			clearTimeout(timer);
			doLoop = false;
			//get posting _id
			postingId = this._id;
			//get posting
			posting = Postings.findOne({_id: postingId});
			//get posting images array
			postingImages = posting.postingImages;
			//get image container
			image = event.currentTarget.children[0];
			//set image to postingImages[0]
			if(postingImages[0]){
				image.src = postingImages[0];			
			}
		}
	});

	Template.searchbox.helpers({
  		getPostings: function() {
    		return PostingsSearch.getData({
      			transform: function(matchText, regExp) {
        			return matchText;
      			},
      			sort: {isoScore: -1}
    			});
  		}
	});

	Template.searchbox.events({
    	'keyup #search-box': function(event) {
    		setTimeout(function(){
    			//set timeout so not all keystrokes fire 
    			//an event
        		var text = $(event.target).val().trim();
        		PostingsSearch.search(text);
 			}, 100);
    	}
	});

	Template.posting.helpers({
		'user': function(){
			var postingOwner = this.createdBy;
			user = Meteor.users.findOne({_id: postingOwner});
			if(user){
				var username = user.username;
			} 
			return username;
		},
		'timedifference': function(){
			postedDate = this.createdAt;
			currentDate = new Date();

			return getTimeDifference(postedDate, currentDate);
		},
		isOwner: function(){
			if(Meteor.user()){
				return this.createdBy == Meteor.user().username;
			}
			return false;
		},
		'posting_is_saved': function(){
		if(Meteor.user()){	
			postingId = this._id;
			//get meteor username
			meteorusername = Meteor.user().username;
			//meteor username is same as Rentstuff_Users username
			currentUser = Rentstuff_Users.findOne({username: meteorusername});
			//get current saved postings array from user profile
			if(currentUser){
			current_saved_postings = currentUser.saved_postings;
			//check if posting has already been saved
			var check = current_saved_postings.indexOf(postingId);
			if(check != -1){
				return true;
			} else{
				return false;
				}
			}
		}
		}
	});

	Template.posting.events({
		'click .save-posting': function(){
			if(!Meteor.userId()){	
			//if not logged in, redirect to login
				Router.go('login');
			}
			else {
				postingId = this._id;
				//get meteor username
				meteorusername = Meteor.user().username;
				//meteor username is same as Rentstuff_Users username
				currentUser = Rentstuff_Users.findOne({username: meteorusername});
				//get current saved postings array from user profile
				current_saved_postings = currentUser.saved_postings;
				//check if posting has already been saved
				var check = current_saved_postings.indexOf(postingId);
				if(check != -1){
					return;
				} else{			
				//else push this posting id onto array
				current_saved_postings.push(this._id);
				//save new array into rentstuff_users profile
				Rentstuff_Users.update({_id: currentUser._id}, 
					{$set:{'saved_postings': current_saved_postings}});
				}
			}
		},
		'click .posting-saved': function(){
			postingId = this._id;
			//get meteor username
			meteorusername = Meteor.user().username;
			//meteor username is same as Rentstuff_Users username
			currentUser = Rentstuff_Users.findOne({username: meteorusername});
			//get current saved postings array from user profile
			current_saved_postings = currentUser.saved_postings;
			//find index of posting in array
			var index = current_saved_postings.indexOf(postingId);
			if(index == -1){
				return;
			} else{			
			//delete this posting id from array
			current_saved_postings.splice(index, 1);
			//save new array into rentstuff_users profile
			Rentstuff_Users.update({_id: currentUser._id}, 
				{$set:{'saved_postings': current_saved_postings}});
			}
		},
		'click .bump': function(){
			createdAt = new Date();
			Postings.update({_id: this._id}, {$set: {createdAt: createdAt}});
		},
		'click #contact_lender': function(){
			var modal = document.getElementById('Modal');
			modal.style.display = "block";
		},
		'click .close': function(){
			var modal = document.getElementById('Modal');
			modal.style.display = "none";
		},
		'click .message_send': function(event){
			//get current user's username
			var currentUser = Meteor.user().username;
			var postingOwner = this.createdBy;
			var text_area = $('textarea.message');
			var message = text_area.val();
			var currentTime = new Date();
			var postingId = this._id;

			conversationId = Conversations.insert(
								{
								lender: postingOwner,
								asker: currentUser,
								postingId: postingId,
								messageTime: currentTime
								});

			Messages.insert({conversationId: conversationId,
							from: currentUser,
							message: message,
							messageTime: currentTime
							});
			//get messaged user's account
			rentstuff_user = Rentstuff_Users.findOne({username: postingOwner});
			//get user's current unread array
			unreadArray = rentstuff_user.unread;
			if(unreadArray){
				unreadArray.push(conversationId);
			}
			else{
				unreadArray = [conversationId];
			}
			//update user's account
			Rentstuff_Users.update({_id: rentstuff_user._id},
								{$set: {unread: unreadArray}});
			//remove text
			text_area.val("");
			//change placeholder
			text_area.attr("placeholder", "Message Sent!");
			console.log(event);
			event.currentTarget.disabled = "true";
			setTimeout(function(){
				//after 1 second, close modal
				var modal = document.getElementById('Modal');
				modal.style.display = "none";
				//change back placeholder
				text_area.attr("placeholder", "Message Sent!");
				//enable button	
				$('button.message_send').prop("disabled", false);	
			}, 1000);			
		}
	});

	var closeModal = function(event){
		var modal = document.getElementById('Modal');
		if(event.target == modal){
			modal.style.display = "none";
		}
	}

	Template.posting.onCreated(function(){
		$(window).on('click', closeModal);
	});

	Template.posting.onDestroyed(function(){
		$(window).off('click', closeModal);
	});

	Template.posting_map.helpers({
		mapOptions: function(){
			if (GoogleMaps.loaded()){
				return {
					center: new google.maps.LatLng(
						this.geocode_address.coordinates[0], 
						this.geocode_address.coordinates[1]
					),
					zoom: 11
				};
			}
		}
	});

	Template.posting_map.onCreated(function() {
		//Get data context
		thiscontext = Template.currentData();
  		// We can use the `ready` callback to interact with the map API once the map is ready.
  		GoogleMaps.ready('map', function(map) {
    		// Add a marker to the map once it's ready
    		var marker = new google.maps.Marker({
    			position: {lat: thiscontext.geocode_address.coordinates[0],
    						 lng: thiscontext.geocode_address.coordinates[1]},
    			map: map.instance,
    			icon: GREEN_MARKER
    		});
  		});
	});

	Template.messenger.helpers({
		borrow_conversations: function(){
			if(Meteor.user()){	
				//get current username
				currentUser = Meteor.user().username;
				//find conversations where user is the asker
				return Conversations.find({asker: currentUser},
										{sort: {messageTime: -1}
										});
			}
		},
		lend_conversations: function(){
			if(Meteor.user()){
				//get current username
				currentUser = Meteor.user().username;
				//find conversations where user is the lender
				return Conversations.find({lender: currentUser},
										{sort: {messageTime: -1}
										});
			}
		},
		conversation_preview: function(){
			conversationId = this._id;
			//return last message of conversation
			return Messages.findOne({conversationId: conversationId},
									{sort: {messageTime: -1, limit: 1}
									});
		},
		posting: function(){
			postingId = this.postingId;
			return Postings.findOne({_id: postingId});
		},
		'showConversation': function(){
			return Session.get('showConversation');
		},
		unread: function(){
			if(Meteor.user()){
				//get current username
				currentUser = Meteor.user().username;
				conversationId = this._id;
				//get user's unread array
				unreadArray = Rentstuff_Users.findOne({username: currentUser}).unread;
				if(unreadArray.indexOf(conversationId) != -1){
					//if index is not -1, it is in unread array
					return 'unread';
				}
				return 'read';
			}
		},
		short_messageTime: function(){
			messageDate = this.messageTime;
			return getMessageTime(messageDate);
		}
	});

	Template.messenger.events({
		'click .tabs .tab-links a': function(event){
			$(document).ready(function(){
				event.preventDefault();
				var currentAttrValue = $(event.currentTarget).attr('href');
				// show/hide tabs
				$('.tab-content ' + currentAttrValue).show().siblings().hide();
				// change/remove current tab to active
				$(event.currentTarget).parent('li').addClass('active').siblings().removeClass('active');
				Session.set('showConversation', null);
			});
		},
		'click .conversation_preview': function(event){
			//toggle message time
			$(event.currentTarget.children[0]).slideToggle(250);
			//toggle preview message
			$(event.currentTarget.children[4].children[0]).slideToggle(250);
			//toggle preview author
			$(event.currentTarget.children[3]).slideToggle(250);
			//get conversation id from html
			conversationId = event.currentTarget.attributes.name.value;
			//set showconversation session variable
			Session.set('showConversation', conversationId);
			//toggle conversation display
			conversation_container = $('#'+conversationId);
			conversation_container.slideToggle(250);
			//get user
			if(Meteor.user()){
				currentUser = Meteor.user().username;
				//get conversation
				conversation = Conversations.findOne({_id: conversationId});
				//update unread array
				rentstuff_user = Rentstuff_Users.findOne({username: currentUser});
				unreadArray = rentstuff_user.unread;

				if(unreadArray){
					//get index of conversationId
					conversationIndex = unreadArray.indexOf(conversationId);
					if(conversationIndex != -1){
						//if it is not -1, it is in the array, remove
						unreadArray.splice(conversationIndex, 1);
					}
				} else{
					unreadArray = [];
				}
				//update collection
				Rentstuff_Users.update({_id: rentstuff_user._id},
									{$set: {unread: unreadArray}});					

			}
			//scroll to bottom of chat
			conversation_container.scrollTop(conversation_container.prop("scrollHeight"));
		}
	});

	Template.conversation.onCreated( function(){
		Messages.find().observe({
    		//observe the Messages collection
    		added: function(document){
    				conversationId = document.conversationId;
    				conversation_container = $('#'+conversationId);
    				//scroll to bottom of chat
					conversation_container.scrollTop(conversation_container.prop("scrollHeight"));		
    		}
    	});
	});

	Template.conversation.helpers({
		checkUser: function(){
			//get user
			if(Meteor.user()){
				currentUser = Meteor.user().username;
				//get conversation
				conversationId = Session.get('showConversation');
				conversation = Conversations.findOne({_id: conversationId});
				//check if user is a participant in conversation
				if(conversation.asker == currentUser || conversation.lender == currentUser){
					//update unread array first
					rentstuff_user = Rentstuff_Users.findOne({username: currentUser});
					unreadArray = rentstuff_user.unread;

					if(unreadArray){
						//get index of conversationId
						conversationIndex = unreadArray.indexOf(conversationId);
						if(conversationIndex != -1){
							//if it is not -1, it is in the array, remove
							unreadArray.splice(conversationIndex, 1);
						}
					} else{
						uneadArray = [];
					}
					//update collection
					Rentstuff_Users.update({_id: rentstuff_user._id},
										{$set: {unread: unreadArray}});					

					return true;
				}
			}
			return false;

		},
		messages: function(){
			var conversationId = this._id;
			return Messages.find({conversationId: conversationId},
									{sort: {messageTime: 1}
									});
		},
		short_messageTime: function(){
			messageDate = this.messageTime;
			return getMessageTime(messageDate);
		},
		sent: function(){
			//get message author
			var from = this.from;
			if(Meteor.user()){
				//if author is the same as user logged in, return true
				if(from == Meteor.user().username){
					return true;
				}
			}
			//else return false
			return false;
		},
		currentUser: function(){
			return Meteor.user().username;
		}
	});

var daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday",
				"Thursday", "Friday", "Saturday"];

function getMessageTime(messageDate){
	var currentDate = new Date();
	messageDate.toLocaleString();
	var messageHour = messageDate.getHours();
	var messageMinutes = messageDate.getMinutes();
	var messageYear = messageDate.getFullYear();
	var messageHalf = ' am';
	//convert to 12 hour days
	if(messageHour > 12){
		messageHour = messageHour - 12;
		messageHalf = ' pm';
	}
	if(messageMinutes < 10){
		messageMinutes = '0' + messageMinutes;
	}
	var dateDifference = currentDate.getDate() - messageDate.getDate();
	//if same day, return today + time
	if(dateDifference == 0){
		return 'Today' + ', ' + messageHour +
				':' + messageMinutes + messageHalf;
	}
	//if within a day, return yesterday+ time
	if((dateDifference > 0 && dateDifference < 1) ||
		(dateDifference < 0 && dateDifference < -29)){
		return 'Yesterday' + ', ' + messageHour +
				':' + messageMinutes + messageHalf;
	}
	//if dates are within a week apart, return day of week and time
	if((dateDifference > 0 && dateDifference < 6) || 
		(dateDifference < -24)){
		return daysOfWeek[messageDate.getDay()] + ', ' + messageHour +
				':' + messageMinutes + messageHalf;
	}  
	//if longer than a week, return date and time
	if(messageYear != currentDate.getFullYear()){
		//if longer than a year, return year
		return messageYear + '/' + (messageDate.getMonth() + 1) +
				'/' + messageDate.getDate() + ' ' + messageHour +
				':' + messageMinutes + messageHalf;
	}
	return (messageDate.getMonth() + 1) + '/' + 
			messageDate.getDate() + ' ' + messageHour + 
			':' + messageMinutes + messageHalf;
}


	Template.conversation.events({
		'click .send_message': function(event){
			event.preventDefault();
			if(Meteor.user()){
				var currentUser = Meteor.user().username;
				var conversationId = event.currentTarget.parentElement.parentElement.id;			
				var message = $('textarea.message#'+conversationId+'message').val();				
				var currentTime = new Date();
				Messages.insert({conversationId: conversationId,
							from: currentUser,
							message: message,
							messageTime: currentTime
							});
				$('textarea.message').val("");
				//get conversation
				var conversation = Conversations.findOne({_id: conversationId});
				Conversations.update({_id: conversation._id}, 
									{$set: {messageTime: currentTime}
									});
				//get which was participant was messaged
				if(conversation.asker == currentUser){
					messaged = conversation.lender;
				} else{
					messaged = conversation.asker;
				}
				//get messaged user's account
				rentstuff_user = Rentstuff_Users.findOne({username: messaged});
				//get user's current unread array
				unreadArray = rentstuff_user.unread;
				if(unreadArray){
					if(unreadArray.indexOf(conversationId) == -1){
					//if conversationId is not already on the array, push
					unreadArray.push(conversationId);
					}
				}
				else{
					unreadArray = [conversationId];
				}
				//update user's account
				Rentstuff_Users.update({_id: rentstuff_user._id},
									{$set: {unread: unreadArray}});
			}
		}
	});

	Template.confirm.helpers({
		'posting': function(){
			postingId = this.postingId;
			return Postings.findOne({_id: postingId});
		},
		'daysBooked': function(){
			daysBooked = Session.get("daysBooked");
			console.log(daysBooked);
			daysBooked = getDate(daysBooked);
			return daysBooked;
		}
	});

	Template.confirm.events({
		'submit form': function(){
			/*when the user clicks confirm, 3 dbs are updated:
			the posting's entry in Postings is updated to being
			booked on days selected, the loaning user's Rentstuff_Users
			"loans" array is updated, and the borrowing user's
			Rentstuff_users "bookings" array is updated
			*/
			event.preventDefault();
			//get current user
			currentUsername = Meteor.user().username;
			console.log(currentUsername);
			console.log(this.postingId);
			//get posting id
			postingId = this.postingId;
			//get added days from session "daysBooked" set in posting events
			addedDays = Session.get("daysBooked");
			console.log(addedDays);
			if(addedDays){
				//find posting from db 
				posting = Postings.findOne({_id: postingId});
				console.log(posting);
				console.log(posting.daysBooked);
				console.log(posting.daysBooked.postingBookings);
				//Update account loaning
				//meteor username is same as rentstuff username
				postingOwner = posting.createdBy;
				console.log(postingOwner);
				postingOwner = Rentstuff_Users.findOne({username: postingOwner});
				console.log(postingOwner);
				//get current loans array
				loansArray = postingOwner.loans;
				console.log(loansArray);
				//loop through number of days booked
				numsDaysBooked = addedDays.length;
				for(i = 0; i<numDaysBooked; i++){
					//make new object "newBooking" with username and addedDays
					newBooking = {postingId: postingId, username: currentUsername, booked: addedDays[i]};
					//push newBooking onto previous saved array
					posting.daysBooked.postingBookings.push(newBooking);	
					newBookingsArray = posting.daysBooked.postingBookings;
					//insert newBooking into posting owner's loansArray
					loansArray = insert(newBooking, loansArray);
					console.log(loansArray);
				}	//update postingBookings in the database
				Postings.update({_id: postingId}, {$set:{daysBooked: {postingBookings: newBookingsArray}}});
				//update posting owner's loans array
				console.log(postingOwner._id);
				Rentstuff_Users.update({_id: postingOwner._id}, {$set:{loans: loansArray}})
				//Update account booking
				//meteor username is same as Rentstuff_Users username
				currentUser = Rentstuff_Users.findOne({username: currentUsername});
				console.log(currentUser);
				//get current bookings from user profile
				current_bookings = currentUser.bookings;
				console.log(current_bookings);
				//create object to add to array
				var bookingObj = {postingId: postingId, 
									days: addedDays}
				console.log(bookingObj);
				//check if posting has already been saved
				var check = current_bookings.indexOf(bookingObj);
				if(check != -1){
					return;
				} else{			
				//else push this bookingObj onto array
				current_bookings.push(bookingObj);
				console.log(current_bookings);
				//save new array into rentstuff_users profile
				Rentstuff_Users.update({_id: currentUser._id}, 
				{$set:{bookings: current_bookings}});
				}	
				Router.go('success');
			}
		}
	});


/*Insert Function for profile loanings*/
function insert(element, array){
	array.splice(locationOf(element,array) + 1, 0, element);
	return array;
}

/*Quicksort Function for profile loanings*/
function locationOf(element, array, start, end){
	if(array.length === 0)
	return -1;

	start = start || 0;
	end = end || array.length;
	var pivot = parseInt(start + (end-start) / 2, 10);
	if(new Date(array[pivot].booked).getTime() === new Date(element.booked).getTime())
		return pivot;
	if(end-start <=1) 
		return new Date(array[pivot].booked).getTime() > new Date(element.booked).getTime() ? pivot - 1 : pivot;
	if(new Date(array[pivot].booked).getTime() < new Date(element.booked).getTime()){
		return locationOf(element,	array,	pivot,	end);
	}else{
		return locationOf(element, array, start, pivot);
	}
}


	Template.profile.helpers({
		'posting': function(){
			profileOwner = this.username;
			return Postings.find({createdBy: profileOwner}, 
					{sort: {createdAt: -1}});
		},
		'timedifference': function(){
			postedDate = this.createdAt;
			currentDate = new Date();

			return getTimeDifference(postedDate, currentDate);
		},
		isOwner: function(){
			if(Meteor.user()){
				return this.username == Meteor.user().username;
			}
			return false;
		}
	});

	Template.profile_loans.helpers({
		'check_loan_date': function(){
			//check if loan date has already passed
			currentDate = new Date();
			//if it has, return false and loan is not displayed
			if(currentDate.getTime() > new Date(this.booked).getTime()){
				return false;
			}
			return true;
		},
		'loans': function(){
			meteorusername = Meteor.user().username;
			//meteor username is same as Rentstuff_Users username
			currentUser = Rentstuff_Users.findOne({username: meteorusername});
			if(currentUser){
			//get current saved postings array from user profile
			loans = currentUser.loans;
			}
			return loans;
		},
		'loans_preview': function(){
			postingId = this.postingId;
			if(postingId){
				return Postings.findOne({_id: postingId});
			}
		},
		'loans_preview_days': function(){
			booked = this.booked;
			if(booked){	
				//getDate takes an array of dates
				return getDate([booked]);
			}
		},
		'timedifference': function(){

			postedDate = this.createdAt;
			currentDate = new Date();

			return getTimeDifference(postedDate, currentDate);
		}
	});

	Template.profile_bookings.helpers({
		'bookings': function(){
			meteorusername = Meteor.user().username;
			//meteor username is same as Rentstuff_Users username
			currentUser = Rentstuff_Users.findOne({username: meteorusername});
			if(currentUser){
			//get current saved postings array from user profile
			current_bookings = currentUser.bookings;
			return current_bookings.reverse();
			}
		},
		'bookings_preview': function(){
			//get postingId
			postingId = this.postingId;
			return Postings.findOne({_id: postingId});
		},
		'bookings_preview_days': function(){
			days = this.days;
			return getDate(days);
		},
		'timedifference': function(){

			postedDate = this.createdAt;
			currentDate = new Date();

			return getTimeDifference(postedDate, currentDate);
		}
	});

	Template.profile_saved_postings.helpers({
		'saved_postings': function(){
			meteorusername = Meteor.user().username;
			//meteor username is same as Rentstuff_Users username
			currentUser = Rentstuff_Users.findOne({username: meteorusername});
			if(currentUser){
			//get current saved postings array from user profile
			current_saved_postings = currentUser.saved_postings;
			return current_saved_postings.reverse();		
			}
		},
		'saved_postings_preview': function(){
			postingId = this.valueOf();
			return Postings.findOne({_id: postingId});
		}
	});

	Template.newPosting.helpers({
		'location_search': function(){
			return(Session.get('locationFilter'));
		},
		'rentstuff_user': function(){
			if(Meteor.user()){
				currentUser = Meteor.user().username;
				return Rentstuff_Users.findOne({username: currentUser});
			}
		},
		'location_saved': function(){
			console.log(this.postalcode);
		}
	});

var weekDaysDisabled = [];

	Template.newPosting.events({
		'submit form': function(){
			event.preventDefault();
			console.log('hi');
			//get current user's id
			var currentUser = Meteor.userId();
			user = Meteor.users.findOne({_id: currentUser});
			if (user){
				//get user's username
				var currentUsername = user.username;
			}
			//get posting information from the DOM
			var title = $('[name="title"]').val();
			var description = $('textarea#new_posting_description').val();
			var postalcode = $('[name="postalcode"]').val();
			var phonenumber = $('[name="phonenumber"]').val();
			var street_address = $('[name="address"]').val();
			var rentalrate = $('[name="rentalrate"]').val();
			var category = Session.get('categorySelect');
			var postingImages = [];
			

			cloudinaryUpload(function(imageArray){
				//upload images to cloudinary with callback
				
				postingImages = imageArray;
				var bookingsArray = [];
				//check if "save details" checkbox is checked
				if(document.getElementById('save_details').checked){
				rentstuff_user = Rentstuff_Users.findOne({username: currentUsername});
					Rentstuff_Users.update({_id: rentstuff_user._id},
											{$set: {postalcode: postalcode,
												phonenumber: phonenumber,
												address: street_address}});
				}
				var address;

				if(street_address.length == 0){
				address = postalcode;
				} else{
					address = street_address;
				}

				console.log(address);

				searchAddress(address, function(geocode_address){
					//search location to get geocoded address, 
					//callback inserts posting into postings collection
					var results = Postings.insert({title: title,
							description: description,
							phonenumber: phonenumber,
							address: address,
							geocode_address: {
								"type": "Point",
								"coordinates": [
								geocode_address.lat,
								geocode_address.lng
								]
							},
							rentalrate: rentalrate,
							category: category,
							createdAt: new Date(),
							createdBy: currentUsername,
							postingImages: postingImages,
							daysBooked: daysBooked = {
								postingBookings: []
							},
							weekDaysDisabled: weekDaysDisabled
					});
					console.log(results);
					Session.set('categorySelect', "");
					Session.set("selected_images", null);
					//go to posting	
					Router.go('posting', {_id: results});
				});
			});
		},
		'click .delete-image': function(){
			event.preventDefault();
			console.log(this);
			console.log(parentData(1));
			deleteImage = this;	//get image url to delete
			deleteImage = deleteImage.valueOf(); 
			var parentthis = Template.parentData(1); //get parent context
			var postingImages = parentthis.postingImages; //get postingImages
			//find item in array
			var deleteImage_index = postingImages.indexOf(deleteImage);
			//delete item from array
			if(deleteImage_index != -1){
				postingImages.splice(deleteImage_index, 1);
			}
			console.log(postingImages);
			//edit saved postingImages object in database
			//Postings.update({_id: parentthis._id}, {$set: {'postingImages': postingImages}});
		},
		'click .disabled-dates input': function(event){
			//get which box was clicked from event
			clicked_box = event.currentTarget.value;
			//get index of clicked_box in weekDaysDisabled array
			clicked_index = weekDaysDisabled.indexOf(clicked_box);
			if(clicked_index == -1){
			//-1 means index not found, push onto array
			weekDaysDisabled.push(clicked_box);
			} else{
			//if index is found, remove clicked_box from the array
				weekDaysDisabled.splice(clicked_index, 1);
			}
			//disable weekDaysDisabled days on datepicker
			$('#new-posting-datepicker').datepicker(
				'setDaysOfWeekDisabled', weekDaysDisabled);
		},
		'click .category-select input': function(event){
			//get category from the DOM
			category = event.currentTarget.value;
			Session.set('categorySelect', category);
		}
	});

	Template.edit.helpers({
		checkCategory: function(){
			console.log(this.category);
			//get current category
			category = this.category;
			$('.category-select input').ready(function(){
			var inputs = $('.category-select input');
			//check which radio button has the value of category
			for(i = 0; i < inputs.length; i++){
				if(inputs[i].value == category){
					//check the button if the value is the same
					inputs[i].checked = true;
				}
			}
		});
		}
	})

	Template.edit.events({
		'submit form': function(){
			event.preventDefault();
			//get current user's id
			var currentUser = Meteor.userId();
			user = Meteor.users.findOne({_id: currentUser});
			if (user){
				//get user's username
				var currentUsername = user.username;
			}
			//keep postingId, get information from the DOM
			var postingId = this._id;
			var title = $('[name="title"]').val();
			var description = $('[name="description"]').val();
			var location = $('[name="location"]').val();
			var address = $('[name="address"]').val();
			var rentalrate = $('[name="rentalrate"]').val();
			var category = this.category;
			if(Session.get('categorySelect')){
				category = Session.get('categorySelect');
			}
			var postingImages = this.postingImages;
			console.log(postingImages);
			if(Session.get("selected_images")){			//if adding more images, 
				addedImages = Session.get("selected_images").imageId;
				if(postingImages.imageId == null){		//check if previous images, if not no push
					postingImages = Session.get("selected_images"); //making postingImages imageupload object
					console.log(postingImages);
				}
				else{		//if there is a previous postingImages object, push addedImages onto array
					postingImages.imageId.push(addedImages);
					console.log(postingImages);
				}
			}
			//keep previous bookings and time created at
			var bookingsArray = this.daysBooked.postingBookings;
			var createdAt = this.createdAt;
			searchAddress(address, function(geocode_address){
				//update postings in callback from searchAddress
				Postings.update({_id: postingId}, {$set:{title: title,
							description: description,
							location: location,
							address: address,
							geocode_address: geocode_address,
							rentalrate: rentalrate,
							category: category,
							createdAt: createdAt,
							createdBy: currentUsername,
							postingImages: postingImages,
							daysBooked: daysBooked = {
								postingBookings: bookingsArray
							}
				}});
				Session.set("selected_images", null);
				//go to posting	
				Router.go('/posting/'+postingId)
			});
		},
		'click .delete-image': function(){
			event.preventDefault();
			console.log(this);
			deleteImage = this;	//get image url to delete
			deleteImage = deleteImage.valueOf(); 
			var parentthis = Template.parentData(1); //get parent context
			var postingImages = parentthis.postingImages; //get postingImages
			//find item in array
			var deleteImage_index = postingImages.indexOf(deleteImage);
			//delete item from array
			if(deleteImage_index != -1){
				postingImages.splice(deleteImage_index, 1);
			}
			console.log(postingImages);
			//edit saved postingImages object in database
			//Postings.update({_id: parentthis._id}, {$set: {'postingImages': postingImages}});
		},
		'click .category-select input': function(event){
			category = event.currentTarget.value;
			Session.set('categorySelect', category);
		}
	});


		Template.register.onRendered(function(){
		var validator = $('.register').validate({
			submitHandler: function(event){
				var email = $('[name=email]').val();
				var username = $('[name=username]').val();
				var password = $('[name=password]').val();
				Accounts.createUser({
					email: email,
					username: username,
					password: password,
				}, function(error){
					if(error){
						if(error.reason == "Email already exists."){
							validator.showErrors({
								email: error.reason
								});
							}
						if(error.reason == "Username already exists."){
							validator.showErrors({
								username:error.reason
							});
						}	
					}
					else {
						Rentstuff_Users.insert({
							username: username,
							email: email,
							bookings: [],
							loans: [],
							saved_postings: []
						});
						Router.go('/');
					}
				});				
			}
		});
			
	});
//
	Template.login.onRendered(function(){
		var validator = $('.login').validate({
			submitHandler: function(event){
			var email = $('[name=email]').val();
			var password = $('[name=password]').val();
			Meteor.loginWithPassword(email, password, function(error){
				if(error){
					if(error.reason == "User not found"){	//if user not found,
						var username = getUsername(email);	//create a new user
						console.log(username);
						console.log(email);
						console.log(password);
						Accounts.createUser({
						email: email,
						username: username,
						password: password,
						loans: [],
						bookings: [],
						unread: []
					}, function(error){
					if(error){
						if(error.reason == "Email already exists."){
							validator.showErrors({
								email: error.reason
								});
							}
						if(error.reason == "Username already exists."){
							validator.showErrors({
								email:error.reason
							});
						}	
					}
					else {
						Rentstuff_Users.insert({
							username: username,
							email: email,
							bookings: [],
							loans: [],
							saved_postings: [],
							unread: []
						});						
						Router.go(Session.get("previousLocationPath"));
					}
				});
					}
					if(error.reason == "Incorrect password"){
						validator.showErrors({
							password: error.reason
						});
					}
				} 	
					else{
						var currentRoute = Router.current().route.getName();
						if(currentRoute == "login"){
						Router.go(Session.get("previousLocationPath"));
						}
					}
				});
			}
		});
	});

	$.validator.setDefaults({
		rules:{
				email: {
					required: true,
					email: true
				},
				password: {
					required: true,
				}
			},
		messages: {
				email: {
					required: "You must enter an email address.",
					email: "You've entered an invalid email address."	
				},
				password: {
					required: "A password is required."
				}
			}
	});

/* Google Maps Geocode*/
function searchAddress(addressInput, fn){
	var geocoder = new google.maps.Geocoder();
	geocoder.geocode({'address': addressInput}, function(results, status){
		if(status == google.maps.GeocoderStatus.OK){
			//results is an array, get first result
			lat = results[0].geometry.location.lat();
			lng = results[0].geometry.location.lng();
			console.log(lat);
			console.log(lng);
			var latlng = {lat: lat, lng: lng};
			fn(latlng);
		} else{
			//warning message
			console.log(status);
		}
	});
}

function createMarker(latlng){
	//If the user makes another search, 
	//clear the marker variable
	if(marker != undefined && marker != ''){
		market.setMap(null);
		marker = '';
	}

	marker = new google.maps.Marker({
		map: map,
		position: latlng
	})
}

/*Username from email*/
function getUsername(email){
	var username = "";
	var i = 0;
		while(email[i] != '@'){
			username += email[i];
			i++;
		}
	return username;
}


/*Datetimepicker.format() to .disabledDate() format, 
	ex: 16/05/2016*/
function toCompactDate(date){
	var compactDate = "";
	compactDate += date[8];
	compactDate += date[9];
	compactDate += "/";
	compactDate += date[5];
	compactDate += date[6];
	compactDate += "/"
	compactDate += date[0];
	compactDate += date[1];
	compactDate += date[2];
	compactDate += date[3];
	return compactDate;
}

/*Datepicker format to readable date*/
function getDate(daysBooked){
var monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
	readableDate = "";
	numDaysBooked = daysBooked.length;
	
	for(i = 0; i < numDaysBooked; i++){ //loop through dates
		if(i > 0){ 							//if adding date, add a comma or "and"
			if((numDaysBooked - 1) != 1){  	//check if last date,
				readableDate += ", " 		//if not, only add comma
			}
			else { 							//else add "and "
				readableDate += " and "
			}
		}
		if(daysBooked[i][0] != 0){	//if two digit month, concatenate
			var month = daysBooked[i][0].concat(daysBooked[1]);
		}
		else {
			var month = daysBooked[i][1];
		}
		intmonth = parseInt(month);
		if(daysBooked[i][3] != 0){ //check if two digit date
			readableDate += monthNames[intmonth-1] + " " + daysBooked[i][3] + daysBooked[i][4]
			+ ", " + daysBooked[i][6] + daysBooked[i][7] + daysBooked[i][8] + daysBooked[i][9];
		} else{	//else only return daysBooked[1] for date
			readableDate += monthNames[intmonth-1] + " " + daysBooked[i][4]
			+ ", " + daysBooked[i][6] + daysBooked[i][7] + daysBooked[i][8] + daysBooked[i][9];
		}
	}
	return readableDate;
}

/* Image Upload*/

$.cloudinary.config({
	cloud_name: "gordonseto"
});
//
	Template.imageupload.events({
	'change input': function(event){
		id = event.currentTarget.id;
		//create image source from input
		image_source = URL.createObjectURL(event.currentTarget.files[0]);
		//append to image container
		$('#image_container').append("<div class='image-wrap'><span class='close' name='"+id+"'>&times;</span><img src='"+image_source+"' /></div>");
	},
	'click .close': function(event){
		input_id = event.currentTarget.attributes.name.value;
		//remove image-wrap parent container when clicked
		event.currentTarget.parentElement.remove();
		//set corresponding input to null
		$('#'+input_id).val('');
	}
});

function cloudinaryUpload(fn){
	event.preventDefault();

	var imageArray = [];
	var numFiles = 0;

	//loop through posting images input
	$("#postingimages input").each(function(){
		
		var files = [];
		//get file from input
		var file = this.files[0];

		if(file != null){
			numFiles++;
			//increment numFiles variable
			files.push(file)
			console.log(files);
			//upload image
			Cloudinary._upload_file(files[0], {}, function(err, res){
				//on callback, add imageurl to imageArray
				if(err){
					console.log(err);
					return;
				}
				var imageurl = res.secure_url;
				console.log(res);
				console.log(res.public_id);
				imageArray.push(imageurl);
				console.log(imageArray);
				console.log(numFiles);
				//if all images are uploaded, finish function
				if(imageArray.length == numFiles){
					fn(imageArray);
				}
			});
		}
	});
	if(numFiles == 0){
		fn(imageArray);
	}
}	

/*Time Difference Function*/

	function getTimeDifference(postedDate, currentDate){
			if(postedDate == null || currentDate == null){
				return;
			}
			postedDate.toUTCString();		//convert both 
			currentDate.toUTCString(); 		//dates to UTC

			postedDate = postedDate.getTime(); //convert both dates
			currentDate = currentDate.getTime();	//to ms			
			timedifference = currentDate - postedDate;
			timedifference /= 1000*60; //time difference is now in mins
			if(timedifference > 60){
				timedifference /= 60; //time difference is now in hours
				if(timedifference > 24){
					timedifference /= 24; //time difference is now in days
					if(timedifference > 30){
						timedifference /= 30; //time difference is now in months
						if(timedifference > 12){
							timedifference /= 12; //time difference is now in years
								timedifference = Math.round(timedifference);
									if (timedifference > 1){
									return timedifference + " years ago";
										}
									return timedifference + " year ago";
							}
						timedifference = Math.round(timedifference);
							if (timedifference != 1){
							return timedifference + " months ago";
								}
							return timedifference + " month ago";
					}
					timedifference = Math.round(timedifference);
					if (timedifference != 1){
					return timedifference + " days ago";
						}
					return timedifference + " day ago";
				}
				timedifference = Math.round(timedifference);
				if (timedifference != 1){
				return timedifference + " hours ago";
					}
				return timedifference + " hour ago";
			}
			timedifference = Math.round(timedifference);
			if (timedifference != 1){
			return timedifference + " minutes ago";
				}
			return timedifference + " minute ago";
	}

	/* Calendar */

Template.newPosting.onRendered(function(){
	currentDate = new Date();
	oneYear = new Date();
	oneYear.setYear(currentDate.getFullYear()+1);
	$('#new-posting-datepicker').datepicker({
		container: '#new-posting-datepicker',
		clearBtn: true,
		startDate: currentDate,
		endDate: oneYear,
		multidate: true
	});	
})

//Calendar doesn't show on navigation without rendered

Template.calendar.rendered = function(){
	currentDate = new Date();
	oneYear = new Date();
	//set year of oneYear to one year greater than current date
	oneYear.setYear(currentDate.getFullYear()+1);
	//Get parent datacontext
	var dataContext = Template.currentData();
	if (dataContext){
	console.log(dataContext);
	//Get postingId from parent context
	postingId = dataContext._id;
	console.log(postingId);
	//find posting
	posting = Postings.findOne({_id: postingId});
	console.log(posting.daysBooked);
	console.log(posting.daysBooked.postingBookings);
	//Check blocked days by using ._map to put 
	//booked key values in array blockedDays
	var blockedDays = posting.daysBooked.postingBookings.map(function(obj){
		return obj.booked;
	});	
	console.log(blockedDays);
		$('#datepicker').datepicker({
			container: '#datepicker',
			startDate: currentDate,
			endDate: oneYear,
			clearBtn: true,
			multidate: true,
			datesDisabled: blockedDays,	//block days booked
			daysOfWeekDisabled: posting.weekDaysDisabled
		});
	}
}

//Calendar doesn't show on reload without onRendered and helper

Template.calendar.onRendered(function(){
	oneYear = new Date();
	oneYear.setYear(currentDate.getFullYear()+1);
	$('#datepicker').datepicker({
		container: '#datepicker',
		startDate: currentDate,
		endDate: oneYear,
		clearBtn: true,
		multidate: true
	});	
});

Template.calendar.helpers({
	blockDates: function(){
		console.log(this._id);
		postingId = this._id;
		if(postingId){
			posting = Postings.findOne({_id: postingId});
			console.log(posting.daysBooked);
			console.log(posting.daysBooked.postingBookings);
			//Check blocked days by using ._map to put 
			//booked key values in array blockedDays
			var blockedDays = posting.daysBooked.postingBookings.map(function(obj){
				return obj.booked;
			});	
			console.log(blockedDays);
			//disable the days in the calendar
			$('#datepicker').datepicker('setDatesDisabled', blockedDays);
			//block days of week
			$('#datepicker').datepicker('setDaysOfWeekDisabled', this.weekDaysDisabled);
		}
	}
});

Template.calendar.events({
	'submit form': function(){
		event.preventDefault();
		//get selected dates
		selected_Dates = $('#datepicker').datepicker('getFormattedDate');
		console.log(selected_Dates);
		//split date string into array of dates
		selected_Dates = selected_Dates.split(','); //split selected_Dates string into
		console.log(selected_Dates);				//seperate values in an array
		currentUser = Meteor.userId();
		if(!currentUser){
			//if not logged in, redirect to login
			Router.go('/login');
		}
		else if(selected_Dates == ""){
			//if no selected dates, alert
			alert('Make sure to pick a booking time');
			}
		else{
			postingId = this._id;
			//set daysBooked session, go to confirm route
			Session.set("daysBooked", selected_Dates);
			Router.go('/posting/'+postingId+'/confirm/');
		}
	}
});
