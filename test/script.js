var baseUrl = "http://geomess.peerates.org";
var nodeUrl = "http://geo.mess.jit.su";
var appName = "app01";
var autoFitEvery=5;
var autoFitCount=0;

var map;
var markerArray = new Array();
var latlngbounds;

var faye;

$(document).ready(function() {
	
		fixConsole(false);
		google.maps.event.addDomListener(window, 'load', initialize);

});

function roundNumber(rnum, rlength) {
	return Math.round(rnum * Math.pow(10, rlength)) / Math.pow(10, rlength);
}
  
 function moveMarker(id, latval, lngval){
	var checkedVal = $('input[name=follow]').filter(':checked').val();
	var autofit = $('#autofit').is(':checked');
	var dofit = false;
	if(autofit){
		autoFitCount++;
		if(autoFitCount>autoFitEvery){
			latlngbounds = new google.maps.LatLngBounds( );
			dofit = true;
			autoFitCount=0;
		}
	}

	for(key in markerArray){
		if(key == id){
			markerArray[key].setPosition(new google.maps.LatLng(parseFloat(latval), parseFloat(lngval)));

			$("#lat_"+id).html(""+roundNumber(latval,6));
			$("#lon_"+id).html(""+roundNumber(lngval,6));

			if(checkedVal == id){
				map.panTo(markerArray[key].getPosition());
			}
			
		}

		if(dofit){
			latlngbounds.extend(markerArray[key].getPosition());
		}
	}
	
	if(dofit)
		map.fitBounds( latlngbounds );

}

function initialize(){
	 setupMap();
	 setupFaye();
}
 
function setupFaye(){
	faye = new Faye.Client(nodeUrl+'/bayeux/faye');
	//faye.disable('websocket');
	    
	var subscription = faye.subscribe('/server/'+appName+'/map', function(message) {
		
		if(message.action=='update')
			moveMarker(message.agentid, message.lat, message.lng);
		
		/*
		if(message.action=='somethingElse')
			doSomethingElse(message);
		 */
		
		console.log(message);
	});

	subscription.callback(function() {
		$("#status").html("subscription active.");
	});

	subscription.errback(function(error) {
		alert("Error creating subscription: "+error.message);
	});
	
}
 
function setupMap() {
	var mapOptions = {
		zoom: 0,
		center: new google.maps.LatLng(0, 0),
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};

	map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);
	latlngbounds = new google.maps.LatLngBounds( );
	
	$("#latbox").append(
		'<div class="item">'+
			'<span id="status">&nbsp;</span>'+
			'<br/>'+
			'<input type="radio" name="follow" value=""/> follow nobody<br/>'+
			'<input type="checkbox" id="autofit" /> auto-fit map'+
		'</div>'
	);
	
	
	$.ajax({
		url: baseUrl+'/services/app/'+appName+'/agents?callback=?',
		dataType: 'jsonp'
	}).done(function ( data ) {

		$.each( data.agents, function( index, agent ) {

			markerArray[agent._id] = new google.maps.Marker({
				position: new google.maps.LatLng(agent.loc[1], agent.loc[0]),
				map: map,
				title: agent.username+' - '+agent.name,
				icon: 'http://geomess.peerates.org/'+agent.icon
			});
			
			latlngbounds.extend(markerArray[agent._id].getPosition());
			
			$("#latbox").append(
				'<div class="item" id="item_'+agent._id+'">'+
					'<input type="radio" name="follow" value="'+ agent._id +'"/> <b>'+agent.username+' - '+agent.name+'</b><br/>'+
					'<span id="lat_'+agent._id+'">'+agent.loc[0]+'</span> '+
					'| <span id="lon_'+agent._id+'">'+agent.loc[1]+'</span> '+
					'<br/>'+
				'</div>'
			);

		});
	
		map.fitBounds( latlngbounds );
		
		for(key in markerArray) {
			triggerInfoWindow(markerArray[key]);
		}
		
	});



}

function triggerInfoWindow(marker){
	var infowindow = new google.maps.InfoWindow({content: marker.title});

	google.maps.event.addListener(marker, 'click', function() {
		infowindow.open(map,marker);
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
