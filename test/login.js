var nodeUrl = "http://geomess.jit.su";
var faye;

$(document).ready(function() {
	
	fixConsole(false);
	
		
		faye = new Faye.Client(nodeUrl+'/bayeux/faye');
		//faye.disable('websocket');

		$("#login").click(function() {
			
			$("#status").attr('value', 'logging in...');
			
			var randHash = rand2();
			$("#responseHash").attr('value', randHash);
			
			var subscription = faye.subscribe('/api/login-response/'+randHash, function(message) {
					//alert("getted response from "+randHash);
					console.log(message);
					$("#result").attr('value', message.response);
					$("#detail").attr('value', message.message);
					$("#token").attr('value', message.token);
					$("#status").attr('value', 'received response');

					subscription.cancel();
			});
			
			subscription.callback(function() {
				$("#status").attr('value', 'sending request');
				
				faye.publish('/api/login-request', {
					username: $("#username").val(),
					password: $("#password").val(),
					app: $("#app").val(),
					responseHash: randHash
				});
				
			});
			
		});

});

var rand = function() {
    return Math.random().toString(36).substr(2); // remove `0.`
};

var rand2 = function() {
    return rand() + rand(); // to make it longer
};

function testSubscribeToResponseWildcard1(){
	var subscription = faye.subscribe('/api/login-response/*', function(message) {
		alert("message from server: "+message.text);
		console.log(message);
	});
	
	subscription.callback(function() {
		  alert('Subscription is now active!');
	});
	
	subscription.errback(function(error) {
		  alert("Error creating subscription: "+error.message);
	});
}

function testSubscribeToResponseWildcard2(){
	var subscription = faye.subscribe('/api/login-response/**', function(message) {
		alert("message from server: "+message.text);
		console.log(message);
	});
	
	subscription.callback(function() {
		  alert('Subscription is now active!');
	});
	
	subscription.errback(function(error) {
		  alert("Error creating subscription: "+error.message);
	});
}

function testSubscribeToResponseWildcard3(){
	var subscription = faye.subscribe('/api/**', function(message) {
		alert("message from server: "+message.text);
		console.log(message);
	});
	
	subscription.callback(function() {
		  alert('Subscription is now active!');
	});
	
	subscription.errback(function(error) {
		  alert("Error creating subscription: "+error.message);
	});
}

/*
 * internet explorer IS SHIT
 */
function fixConsole(alertFallback) {    
    if (typeof console === "undefined"){
        console = {}; // define it if it doesn't exist already
    }
    if (typeof console.log === "undefined") {
        if (alertFallback) { console.log = function(msg) { alert(msg); }; } 
        else { console.log = function() {}; }
    }
    if (typeof console.dir === "undefined") {
        if (alertFallback) { 
            console.dir = function(obj) { alert("DIR: "+obj); }; 
        }
        else { console.dir = function() {}; }
    }
}
