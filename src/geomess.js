var GeoMessClient = function(baseUrl) {
  
	this.baseUrl = baseUrl;
	this.fayeEndpoint = '/bayeux/faye';

	this.faye = null;
	this.responseSubscription==null;
	this.responseSubscribed = false;
	this.waitTimeout = 200;
	this.waitIncrement = 200;
	this.websocketDisabled=false;
	
	this.session = null;
	this.initialized = false;
	this.loggedin = false;

	this.username = null;
	this.token = null;
	this.app = null;
	
	this.agents = new Array();
	this.agentTypes = new Array();

};

GeoMessClient.prototype.init = function() {

	this.initRandomSession();
	this.initListeners();
	this.initFayeClient();

};

GeoMessClient.prototype.initListeners = function() {
	var self = this;
	
	//response listeners
	self.on('login-success', function(message){
		self.loggedin = true;
		self.username = message.username;
		self.app = message.app;
		self.token = message.token;
	});
	
	self.on('login-error', function(message){
		self.loggedin = false;
		self.username = null;
		self.app = null; //need this?
		self.token = null;
	});

	self.on('response-subscribed', function(){
		self.responseSubscribed = true;
	});

	self.on('agent-list-response', function(message){

		for(var idx in message.agents){
			var agent = message.agents[idx];
			self.agents[agent._id] = agent;
		}

		self.emit('agents-loaded');
	});
	
	self.on('agent-types-list-response', function(message){

		for(var idx in message.agentTypes){
			var type = message.agentTypes[idx];
			self.agentTypes[type._id] = type.image;
		}

		self.emit('agent-types-loaded');
	});
	
	self.on('new-agent', function(message){

		var check = self.getAgent(message.agent._id);
		if(check==null){
			self.agents[message.agent._id] = message.agent;
		}
		self.emit('new-agent-loaded', message.agent._id);
	});
};

GeoMessClient.prototype.initFayeClient = function() {
	if(this.initialized==false){
		this.faye = new Faye.Client(this.baseUrl+this.fayeEndpoint);
		if(this.websocketDisabled==true)
			this.faye.disable('websocket');
		this.initialized = true;
		this.emit('init');
	}
};

GeoMessClient.prototype.initRandomSession = function() {
	if(this.session==null){
		//FIXME: use a more strong RNG function than Math.random()
	    this.session = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2); 
	    this.emit('created-session', this.session);
	}else{
	    this.emit('existing-session', this.session);
	}
};

GeoMessClient.prototype.getAgent = function(agentId) {
	return this.agents[agentId];
};

GeoMessClient.prototype.getAgents = function() {
	return this.agents;
};

GeoMessClient.prototype.getMarker = function(agentId) {
	return this.agents[agentId].marker;
};

GeoMessClient.prototype.setSpeed = function(agentId, speed) {
	this.agents[agentId].speed = speed;
};

GeoMessClient.prototype.getOrCreatePolyline = function(map, agentId) {
	
	if(this.agents[agentId].polyline==null){

	    var polyOptions = {
	            strokeColor: '#000000',
	            strokeOpacity: 1.0,
	            strokeWeight: 3
	    };
	    
	    poly = new google.maps.Polyline(polyOptions);
	    poly.setMap(map);
	    this.agents[agentId].polyline = poly;
	}
    
	return this.agents[agentId].polyline;
};


GeoMessClient.prototype.triggerInfoWindow = function(map, agentId) {
	var self = this;
	var marker = this.agents[agentId].marker;
	
	var infoWindow = new google.maps.InfoWindow({content: marker.title});
	
	this.agents[agentId].infoWindow = infoWindow;

	google.maps.event.addListener(marker, 'click', function() {
		var agent = self.agents[marker.idx];
		infoWindow.setContent(
				'<img src="'+marker.icon+'"/>'+
				'<b>'+agent.name+'</b><br/>'+
				(agent.status != undefined ? 'status: '+agent.status+'<br/>' : '')+
				(agent.speed != undefined ? 'speed: '+agent.speed+'<br/>' : '')
		);
		infoWindow.open(map, marker);
	});	
};


GeoMessClient.prototype.setMarker = function(agentId, marker) {
	this.agents[agentId].marker = marker;
};

GeoMessClient.prototype.setStatus = function(agentId, status) {
	this.agents[agentId].status = status;
};

GeoMessClient.prototype.getMarkerIcon = function(type) {
	return this.agentTypes[type];
};

GeoMessClient.prototype.setApp = function(appVal) {
	this.app = appVal;
};

GeoMessClient.prototype.listenToApp = function() {

	var self = this;
	
	var subscription = self.faye.subscribe('/server/'+self.app+'/map', function(message) {
		self.emit(message.event, message);
	});

	subscription.callback(function() {
		self.emit('app-subscription-active', self.app);
	});

	subscription.errback(function(error) {
		self.emit('app-subscription-error', self.app, error);
	});

};

GeoMessClient.prototype.listenToResponse = function() {

	var self = this;
	
	self.responseSubscription = self.faye.subscribe('/api/response/'+self.session, function(message) {
		console.log("response",message);
		self.emit(message.event, message);
	});
	
	self.responseSubscription.callback(function() {
		self.emit('response-subscribed');
	});
	
};

GeoMessClient.prototype.login = function(appVal, usernameVal, passwordVal) {
	var self = this;
		
	if(this.waitForResponseSubscription(arguments.callee, arguments)){

		var publication = self.faye.publish('/api/login-request', {
			username: usernameVal,
			password: passwordVal,
			app: appVal,
			responseHash: self.session
		});
		
		publication.callback(function() {
			self.emit('login-sent');
		});
		
	}

};

GeoMessClient.prototype.loadAgents = function() {
	//console.log("loadAgents");
	var self = this;
	
	if(this.waitForResponseSubscription(arguments.callee, arguments)){

		var publication = self.faye.publish('/api/get-agents', {
			app: self.app,
			responseHash: self.session
		});
		
		publication.callback(function() {
			self.emit('get-agents-sent');
		});
	}
};

GeoMessClient.prototype.loadAgentTypes = function() {
	//console.log("loadAgentTypes");
	var self = this;
	
	if(this.waitForResponseSubscription(arguments.callee, arguments)){

		var publication = self.faye.publish('/api/get-agent-types', {
			responseHash: self.session
		});
		
		publication.callback(function() {
			self.emit('get-agent-types-sent');
		});
	}
};
/*
 * semaphore on subscription to response channel.
 *
 * loop on funct(args) until subscription to response channel is made.
 * 
 * use like this:
 * 
 * if(this.waitForResponseSubscription(arguments.callee, arguments)){
 *    //code that need response channel subscription
 * }
 * 
 * FIXME: not sure this is cross browser and a good practice...
 */
GeoMessClient.prototype.waitForResponseSubscription = function(funct, args){
	var self = this;
		
	//if not subscribed to response channel
	if(self.responseSubscribed==false){
		//check again and subscribe
		if(self.responseSubscription==null)
			self.listenToResponse();

		//after a timeout
		setTimeout(
			function() {
				//call the function that called me 
				funct.apply(self, args);	
			}, self.waitTimeout
		);
		
		//increment waittimeout every time
		self.waitTimeout += self.waitIncrement;

		return false;
	}
	return true;
};

/* simple event emitter from MicroEvent.js - https://github.com/jeromeetienne/microevent.js */
GeoMessClient.prototype.on = function(event, fct){
	//console.log('event.on: '+event);
	this._events = this._events || {};
	this._events[event] = this._events[event]	|| [];
	this._events[event].push(fct);
};
GeoMessClient.prototype.removeListener = function(event, fct){
//	console.log('event.removeListener',event);
	this._events = this._events || {};
	if( event in this._events === false  )	return;
	this._events[event].splice(this._events[event].indexOf(fct), 1);
};
GeoMessClient.prototype.emit = function(event /* , args... */){
	//console.log('event.emit: '+event, arguments);
	this._events = this._events || {};
	if( event in this._events === false  )	return;
	for(var i = 0; i < this._events[event].length; i++){
		this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
	}
};
GeoMessClient.prototype.debugAttachedEvents = function(){
	//FIXME: not sure this is working...
	console.log("attached events: ");
	for(var event in this._events){
		console.log("event: "+event);
	}
};