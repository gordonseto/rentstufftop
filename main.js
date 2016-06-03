Meteor.methods({
  'savePosting': function(postingId){ //save posting method
    	if(Meteor.user()){
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
        	current_saved_postings.push(postingId);
        	//save new array into rentstuff_users profile
        	Rentstuff_Users.update({_id: currentUser._id}, 
          	{$set:{'saved_postings': current_saved_postings}});
        }
    }
  },
  'unsavePosting': function(postingId){
  		if(Meteor.user()){
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
  		}
  },
  'bumpPosting': function(postingId){
  		if(Meteor.user()){
  			createdAt = new Date();
			Postings.update({_id: postingId}, {$set: {createdAt: createdAt}});
  		}
  },
  'postingMessageSend': function(postingId, postingOwner, message){
  	if(Meteor.user()){
		var currentUser = Meteor.user().username; 		
		var currentTime = new Date();
  		conversationId = Conversations.insert({
								lender: postingOwner,
								asker: currentUser,
								postingId: postingId,
								messageTime: currentTime
								});
  		console.log(conversationId);
  		console.log(message);
		Messages.insert({conversationId: conversationId,
							from: currentUser,
							message: message,
							messageTime: currentTime
							});
		Meteor.call('markAsUnread', conversationId, postingOwner);
  	}
  },
  'markAsRead': function(conversationId){
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
  },
  'markAsUnread': function(conversationId, username){
  		if(Meteor.user()){
			//get messaged user's account
			rentstuff_user = Rentstuff_Users.findOne({username: username});
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
  },
  'sendMessage': function(conversationId, message){
  		if(Meteor.user()){
  			var currentUser = Meteor.user().username;
			var currentTime = new Date();

			Messages.insert({conversationId: conversationId,
							from: currentUser,
							message: message,
							messageTime: currentTime
							});  	
			
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

			Meteor.call('markAsUnread', conversationId, messaged);							
  		}
  },
  'confirmBooking': function(postingId, addedDays){
		/*when the user clicks confirm, 3 dbs are updated:
		the posting's entry in Postings is updated to being
		booked on days selected, the loaning user's Rentstuff_Users
		"loans" array is updated, and the borrowing user's
		Rentstuff_users "bookings" array is updated
		*/
  	if(Meteor.user()){
  		//get current user
		currentUsername = Meteor.user().username;		
			
		if(addedDays){
			console.log(addedDays);
			//find posting from db 
			posting = Postings.findOne({_id: postingId});
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
			for(i = 0; i < addedDays.length; i++){
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
		}
  	}
  },
  'newPosting': function(title, description, postalcode, phonenumber, 
  						street_address, address, geocode_address,
  						rentalrate, category, postingImages,
  						bookingsArray, weekDaysDisabled, checked){
 	if(Meteor.user()){
 		var currentUsername = Meteor.user().username;
 		//check if "save details" checkbox is checked
 		if(checked){
			rentstuff_user = Rentstuff_Users.findOne({username: currentUsername});
			Rentstuff_Users.update({_id: rentstuff_user._id},
									{$set: {postalcode: postalcode,
									phonenumber: phonenumber,
									address: street_address}});
		}

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
 	} 	
  },
  'createRentstuffUser': function(username, email){
  		Rentstuff_Users.insert({
								username: username,
								email: email,
								bookings: [],
								loans: [],
								saved_postings: []
							});
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

