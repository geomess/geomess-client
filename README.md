geomess-client
==============

Javascript client for geomess


events emitted
---------

* **init**: client has finished initialization
* **created-session**: new session has been created
	* session: value of the session
* **login-sent**: login request is sent
* **login-success**: login successful
	* message.username
	* message.app
	* message.token
* **login-error**: login failed
	* message.message: error detail
* **update-position**: agent position updated
	* message.agentid
	* message.lat
	* message.lng
* **update-status**: agent status updated
	* message.agentid
	* message.status
* **response-subscribed**: client has subscribed to response channel
* **agents-loaded**: agent list has been loaded
* **agent-types-loaded**: agent types list has been loaded
* **app-subscription-active**: client has subscribed to app channel
	* app: application id
* **app-subscription-error**: client has not subscribed to response channel because of an error
	* app: application id
	* error: error occurred
	