var animateLocks = {};
var trailLenght = 30;
var appalias="sfbus";

var map;
var geomess;

$(document).ready(function() {
		
		var paramapp = getParameterByName("app");
		if(paramapp!=""&&paramapp!=undefined&&paramapp!=null)
			appalias = paramapp;
	
		//login top slider
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
		
		geomess = new GeoMessClient("http://geomess.jit.su");
		geomess.setApp(appalias);
				
		geomess.on('update-position', function(message){
			$("#item_"+message.agentid).animateHighlight();
			moveMarker(message.agentid, message.lat, message.lng, message.speed);
			console.log('update-position', message);
		});

//		geomess.on('update-status', function(message){
//			$("#item_"+message.agentid).animateHighlight();
//			updateStatus(message.agentid, message.status);
//			console.log('update-status', message);
//		});
		
		
		geomess.on('app-subscription-active', function(){
			$("#status").html("subscription active.");
			console.log('app-subscription-active');
		});

		geomess.on('agents-loaded', function(){
			
			setupMap('map_canvas', geomess.getAgents());
			
			console.log('agents-loaded');
		});
		
		geomess.on('new-agent-loaded', function(idx){
			
			var agent = geomess.getAgent(idx);
			processAgent(map, agent, idx, null);
			
			console.log('new-agent-loaded');
		});
		
		
		
		//login
		$("#login_btn").click(function() {
			$("#login_btn").attr('disabled','disabled');
			geomess.login(appalias, $("#username").val(), $("#password").val());
		});
	
		geomess.on('login-success', function(message){
			$("#login").html("<div class=\"centered\"><p><br/><br/>welcome "+message.username+"!</p></div>");
			
			//close panel
			setTimeout(function(){
				$("div#panel").animate({height: "0px"}, "slow");
				$("div.panel_button").toggle();
			}, 2000);

			console.log('login-success', message);
		});
		
		geomess.on('login-error', function(message){
			$(".login_label").css("color","#ff5050");
			$("#error_message").html("login failed!");
			$("#password").attr('value','');
			$("#login_btn").removeAttr('disabled');
			console.log('login-failure', message);
		});
		
		
		google.maps.event.addDomListener(window, 'load', initialize);
});

function initialize(){
	geomess.init();
	geomess.listenToApp();

	geomess.loadAgentTypes();
	
	geomess.on('agent-types-loaded', function(){
		geomess.loadAgents();
	});
	
}

function roundNumber(rnum, rlength) {
	return Math.round(parseFloat(rnum) * Math.pow(10, rlength)) / Math.pow(10, rlength);
}

function updateStatus(id, status){
	geomess.setStatus(id, status);
	$("#status_"+id).html(status);
}

function updatePolyline(id, position){
	var polyline = geomess.getOrCreatePolyline(map, id);
	var path = polyline.getPath();
    path.push(position);
    
    if(path.getLength()>trailLenght)
    	path.removeAt(0);
}

function moveMarker(id, latval, lngval, speed){
	var checkedVal = $('input[name=follow]').filter(':checked').val();
	var autofit = $('#autofit').is(':checked');

	var marker = geomess.getMarker(id);
		
	updatePolyline(id, marker.getPosition());
	
	marker.setPosition(new google.maps.LatLng(parseFloat(latval), parseFloat(lngval)));

	updatePolyline(id, marker.getPosition());

	$("#speed_"+id).html(""+roundNumber(speed,2)+" km/h");
	geomess.setSpeed(id, ""+roundNumber(speed,2)+" km/h");
	
	if(checkedVal == id){
		map.panTo(marker.getPosition());
	}
	
	if(autofit){
		if(!map.getBounds().contains(marker.getPosition())){
			var latlngbounds = new google.maps.LatLngBounds( );
			var agents = geomess.getAgents();
			for(var idx in agents){
				var agent = agents[idx];
				latlngbounds.extend(agent.marker.getPosition());
			}
			map.fitBounds( latlngbounds );
		}
	}
		
}

function processAgent(map, agent, idx, latlngbounds){
	var agentIcon = geomess.getMarkerIcon(agent.type);
	var marker = new google.maps.Marker({
		position: new google.maps.LatLng(agent.loc[1], agent.loc[0]),
		map: map,
		title: agent.name,
		icon: agentIcon
	});
	
	marker.idx = idx;
	
	if(latlngbounds!=null)
		latlngbounds.extend(marker.getPosition());
	
	updatePolyline(idx, marker.getPosition());
	
	$("#latpanel").append(
		'<div class="item" id="item_'+idx+'">'+
			'<b>'+agent.name+'</b> <span style="display:none;" id="speed_'+idx+'"></span>'+
			'<br/>'+
		'</div>'
	);

	geomess.setMarker(idx, marker);
	
	geomess.triggerInfoWindow(map, idx);

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
		'<div class="item" style="display:block;">'+
			'<span id="status" style="display:none;">&nbsp;</span>'+
			'<input type="checkbox" id="autofit" /> auto-fit map'+
		'</div>'
	);
		
	for(var idx in agents){
		var agent = agents[idx];
		processAgent(map, agent, idx, latlngbounds);
	}
	
	map.fitBounds( latlngbounds );
	
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


$.fn.animateHighlight = function(highlightColor, duration) {
		var myid = $(this).attr("id");
		if(animateLocks[myid] == "executing"){
			//already executing, do nothing...
		}else{
			animateLocks[myid] = "executing";
			var highlightBg = highlightColor || "#ff5050";
		    var animateMs = duration || 2000;
		    var originalBg = this.css("backgroundColor");
		    this.stop().css("background-color", highlightBg).animate({backgroundColor: originalBg}, animateMs, function() {
		        // Animation complete.
			    delete animateLocks[myid];
		    });
		}
};

function getParameterByName(name)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.search);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
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
