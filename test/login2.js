var geomess;

$(document).ready(function() {
	
	fixConsole(false);
	
	geomess = new GeoMess("http://geo.mess.jit.su");

	geomess.on('init', function(){
		console.log('init');
	});
	
	geomess.on('created-session', function(session){
		$("#status").attr('value', 'created session');
		$("#responseHash").attr('value', session);
		$("#result").attr('value', '');
		$("#detail").attr('value', '');
		$("#token").attr('value', '');
		console.log('created-session', session);
	});
	
	geomess.on('login-success', function(message){
		$("#status").attr('value', 'login success');
		$("#result").attr('value', message.event);
		$("#detail").attr('value', message.message);
		$("#token").attr('value', message.token);
		
		$("#login").removeAttr('disabled');
		
		console.log('login-success', message);
	});
	
	geomess.on('login-error', function(message){
		$("#status").attr('value', 'login failure');
		$("#result").attr('value', message.event);
		$("#detail").attr('value', message.message);

		$("#login").removeAttr('disabled');

		console.log('login-failure', message);
	});
	
	geomess.on('response-subscribed', function(){
		$("#status").attr('value', 'subcribed to response');
		console.log('response-subscribed');
	});

	geomess.on('login-sent', function(){
		$("#status").attr('value', 'login sent');
		console.log('login-sent');
	});

	
	geomess.init();
	
	$("#login").click(function() {
		
		$("#status").attr('value', 'logging in...');
		$("#login").attr('disabled','disabled');
		
		geomess.login($("#app").val(), $("#username").val(), $("#password").val());
		
	});

});

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
