var $parcel$modules = {};
var $parcel$bundles = {};

var $parcel$global =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof self !== 'undefined'
    ? self
    : typeof window !== 'undefined'
    ? window
    : typeof global !== 'undefined'
    ? global
    : {};

if ($parcel$global[parcelRequireName] == null) {
  var parcelRequire = function(name) {
    // Execute the bundle wrapper function if there is one registered.
    if (name in $parcel$bundles) {
      $parcel$bundles[name]();
      delete $parcel$bundles[name];
    }

    if (name in $parcel$modules) {
      return $parcel$modules[name];
    }

    // Try the node require function if it exists.
    // Do not use `require` to prevent Webpack from trying to bundle this call
    if (typeof module !== 'undefined' && typeof module.require === 'function') {
      return module.require(name);
    }

    var err = new Error("Cannot find module '" + name + "'");
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  };

  parcelRequire.register = function register(id, exports) {
    $parcel$modules[id] = exports;
  };

  parcelRequire.registerBundle = function registerBundle(id, fn) {
    $parcel$bundles[id] = fn;
    $parcel$modules[id] = {};
  };

  $parcel$global[parcelRequireName] = parcelRequire;
}
