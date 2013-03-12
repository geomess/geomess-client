var GeoMess = function(baseUrl) {
  
	this.baseUrl = baseUrl;
	this.fayeEndpoint = '/bayeux/faye';

	this.faye = null;
	this.responseSubscription==null;
	this.responseSubscribed = false;
	this.waitTimeout = 150;
	
	this.session = null;
	this.initialized = false;
	this.loggedin = false;

	this.username = null;
	this.token = null;
	this.app = null;
	
	this.agents = new Array();

};

GeoMess.prototype.init = function() {

	this.initRandomSession();
	this.initListeners();
	this.initFayeClient();

};

GeoMess.prototype.initListeners = function() {
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

	self.on('response-subscribed', function(message){
		self.responseSubscribed = true;
	});

	
};

GeoMess.prototype.initFayeClient = function() {
	if(this.initialized==false){
		this.faye = new Faye.Client(this.baseUrl+this.fayeEndpoint);
		this.initialized = true;
		this.emit('init');
	}
};

GeoMess.prototype.initRandomSession = function() {
	if(this.session==null){
		//FIXME: use a more strong RNG function than Math.random()
	    this.session = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2); 
	    this.emit('created-session', this.session);
	}else{
	    this.emit('existing-session', this.session);
	}
};

GeoMess.prototype.getAgent = function(agentId) {
	return this.agents[agentid];
};

GeoMess.prototype.listenToApp = function(appVal) {
	var self = this;
	
	self.app = appVal;
	
	var subscription = self.faye.subscribe('/server/'+appVal+'/map', function(message) {
		self.emit(message.event, message);
	});

	subscription.callback(function() {
		self.emit('app-subscription-active', appVal);
	});

	subscription.errback(function(error) {
		self.emit('app-subscription-error', appVal, error);
	});

};

GeoMess.prototype.listenToResponse = function() {
	var self = this;
	
	self.responseSubscription = self.faye.subscribe('/api/response/'+self.session, function(message) {
		self.emit(message.event, message);
	});
	
	self.responseSubscription.callback(function() {
		self.emit('response-subscribed');
	});
	
};

GeoMess.prototype.login = function(appVal, usernameVal, passwordVal) {
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
GeoMess.prototype.waitForResponseSubscription = function(funct, args){
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
		
		return false;
	}
	return true;
};

/* simple event emitter from MicroEvent.js - https://github.com/jeromeetienne/microevent.js */
GeoMess.prototype.on = function(event, fct){
	console.log('event.on',event);
	this._events = this._events || {};
	this._events[event] = this._events[event]	|| [];
	this._events[event].push(fct);
};
GeoMess.prototype.removeListener = function(event, fct){
	console.log('event.removeListener',event);
	this._events = this._events || {};
	if( event in this._events === false  )	return;
	this._events[event].splice(this._events[event].indexOf(fct), 1);
};
GeoMess.prototype.emit = function(event /* , args... */){
	console.log('event.emit('+event+')', arguments);
	this._events = this._events || {};
	if( event in this._events === false  )	return;
	for(var i = 0; i < this._events[event].length; i++){
		this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
	}
};
