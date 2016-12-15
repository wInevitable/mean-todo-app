(function(global){
  // Local global var
  var _global = {};

  function DataManager(options) {
    this.connection= options.connection;
    _global.collections = this.collections = options.collections;
    _global.isConnectionAlive = false;
    _global.connectCallback = this.connectCallback = options.connectCallback;
    this.init();
  }

  DataManager.prototype.init = function() {
    var self = _global = this;
    var socketCollection = self.socketCollection = {}; // collection sockets objects

    // Init a new socket
    var socket = self.Socket = io(self.connection);

    socket.on('connect', self._connect);
    socket.on('disconnect', self._disconnect);
    socket.on('reconnect_attempt', self._reconnectAttempt);
    socket.on('reconnect', self._reconnect);
    socket.on('reconnect_error', self._reconnectError);
    socket.on('reconnect_failed', self._reconnectFailed);

    // "Sub-Socket" for each collection
    var collections = self.collections;
    collections.forEach(function(collection) {
      var name = collection.name;
      var _socket = io(self.connection + '/' + name);

      Object.keys(collection.subscribers).forEach(function(method) {
        _socket.on(method, collection.subscribers[method]);
      });

      socketCollection[name] = _socket;
    });

    return self;
  };

  DataManager.prototype.pubData = function(collection, endpoint, data, callback) {
    var self = this;

    if (_global.isConnectionAlive) {
      self.socketCollection[collection].emit(endpoint, data);
    } else {
      saveToLocalStorage(collection, {
        "endpoint": endpoint,
        "data": data
      });
    }

    callback(!_global.isConnectionAlive);
  };

  DataManager.prototype._connect = function() {
    _global.isConnectionAlive = true;

    // sync the localStorage first
    var collections = _global.collections;

    collections.forEach(function(collection) {
      var localData = getFromLocalStorage(collection.name);

      if (localData) {
        localData.forEach(function(data) {
          _global.socketCollection[collection.name].emit(data.endpoint, data.data);
        });
      }

      clearCollection(collection.name);
    });

    _global.connectCallback();
  };

  DataManager.prototype._disconnect = function() {
    _global.isConnectionAlive = false;
  };

  DataManager.prototype._reconnectAttempt = function() {
    _global.isConnectionAlive = false;
  };

  DataManager.prototype._reconnect = function() {
    _global.isConnectionAlive = false;
  };

  DataManager.prototype._reconnectError = function() {
    _global.isConnectionAlive = false;
  };

  DataManager.prototype._reconnectFailed = function() {
    _global.isConnectionAlive = false;
  };

  function saveToLocalStorage(collection, data) {
    var savedData = getFromLocalStorage(collection);
    var localStorageData = savedData || [];

    localStorageData.push(data);
    localStorage.setItem(collection, JSON.stringify(localStorageData));
  }

  function clearCollection(collection) {
    localStorage.setItem(collection, null);
  }

  function getFromLocalStorage(collection) {
    return JSON.parse(localStorage.getItem(collection));
  }

  global.DataManager = DataManager;
})(this);
