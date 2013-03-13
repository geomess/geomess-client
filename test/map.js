var autoFitEvery=5;
var autoFitCount=0;

var map;

var geomess;

$(document).ready(function() {
	
		$("div.panel_button").click(function(){
			$("div#panel").animate({ height: "500px" }).animate({height: "400px"}, "fast");
			$("div.panel_button").toggle();
		});	
		
		$("div#hide_button").click(function(){
			$("div#panel").animate({height: "0px"}, "fast");
		});	
	
		$("#map_canvas").css({"visibility":"hidden"});
		$("#toppanel").css({"visibility":"hidden"});
		
		fixConsole(false);
		
		geomess = new GeoMessClient("http://geo.mess.jit.su");
		geomess.setApp("app01");
				
		geomess.on('update-position', function(message){
			moveMarker(message.agentid, message.lat, message.lng);
			console.log('update-position', message);
		});

		geomess.on('update-status', function(message){
			updateStatus(message.agentid, message.status);
			console.log('update-status', message);
		});
		
		
		geomess.on('app-subscription-active', function(){
			$("#status").html("subscription active.");
			console.log('app-subscription-active');
		});

		geomess.on('agents-loaded', function(){
			
			setupMap('map_canvas', geomess.getAgents());
			
			console.log('agents-loaded');
		});
	
		google.maps.event.addDomListener(window, 'load', initialize);
});

function initialize(){
	geomess.init();
	geomess.loadAgentTypes();
	geomess.loadAgents();
	geomess.listenToApp();
}

function roundNumber(rnum, rlength) {
	return Math.round(rnum * Math.pow(10, rlength)) / Math.pow(10, rlength);
}

function updateStatus(id, status){
	geomess.setStatus(id, status);
	$("#status_"+id).html(status);
}

function moveMarker(id, latval, lngval){
	var checkedVal = $('input[name=follow]').filter(':checked').val();
	var autofit = $('#autofit').is(':checked');
	var dofit = false;
	var latlngbounds = null;
	if(autofit){
		autoFitCount++;
		if(autoFitCount>autoFitEvery){
			latlngbounds = new google.maps.LatLngBounds( );
			dofit = true;
			autoFitCount=0;
		}
	}

	var marker = geomess.getMarker(id);
	marker.setPosition(new google.maps.LatLng(parseFloat(latval), parseFloat(lngval)));

	$("#lat_"+id).html(""+roundNumber(latval,6));
	$("#lon_"+id).html(""+roundNumber(lngval,6));

	if(checkedVal == id){
		map.panTo(marker.getPosition());
	}
	
	if(dofit){
		var agents = geomess.getAgents();
		for(var idx in agents){
			var agent = agents[idx];
			latlngbounds.extend(agent.marker.getPosition());
		}
		map.fitBounds( latlngbounds );
	}
	
}

function setupMap(mapDiv, agents) {
	var mapOptions = {
		zoom: 0,
		center: new google.maps.LatLng(0, 0),
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};

	map = new google.maps.Map(document.getElementById(mapDiv), mapOptions);
	var latlngbounds = new google.maps.LatLngBounds( );
	
	$("#latpanel").append(
		'<div class="item">'+
			'<span id="status">&nbsp;</span>'+
			'<br/>'+
			'<input type="radio" name="follow" value=""/> follow nobody<br/>'+
			'<input type="checkbox" id="autofit" /> auto-fit map'+
		'</div>'
	);
		
	for(var idx in agents){
		var agent = agents[idx];
		
		var agentIcon = geomess.getMarkerIcon(agent.type);
		var marker = new google.maps.Marker({
			position: new google.maps.LatLng(agent.loc[1], agent.loc[0]),
			map: map,
			title: agent.name,
			icon: agentIcon
		});
		
		latlngbounds.extend(marker.getPosition());
		
		$("#latpanel").append(
			'<div class="item" id="item_'+idx+'">'+
				'<input type="radio" name="follow" value="'+ idx +'"/> <b>'+agent.name+'</b>'+
				' | <span id=\"status_'+idx+'\">'+agent.status+'</span><br/>'+
				'<span id="lat_'+idx+'">'+roundNumber(agent.loc[0], 6)+'</span> '+
				'| <span id="lon_'+idx+'">'+roundNumber(agent.loc[1], 6)+'</span> '+
				'<br/>'+
			'</div>'
		);

		geomess.setMarker(idx, marker);
	}
	
	map.fitBounds( latlngbounds );
	
	for(var idx in agents){
		triggerInfoWindow( geomess.getMarker(idx) );
	}

	$("#"+mapDiv).css({"visibility":"visible"});
	$("#toppanel").css({"visibility":"visible"});
	
	$("#loading").css({"display":"none"});
	
	$("div#latpanel").animate({right: "5px"}, "slow");
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
