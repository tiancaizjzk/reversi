class DeviceMotionEvent {
  constructor() {
    this.type = 'devicemotion';
    this.accelerationIncludingGravity = null;
  }
}

let registerFunc = _cc.inputManager._registerAccelerometerEvent.bind(_cc.inputManager);
_cc.inputManager._registerAccelerometerEvent = function () {
  // register engine AccelerationEventListener to get acceleration data from wx
  registerFunc();

  wx.onAccelerometerChange && wx.onAccelerometerChange(function (res) {
    let deviceMotionEvent = new DeviceMotionEvent();
    let resCpy = {};
    resCpy.x = res.x;
    resCpy.y = res.y;
    resCpy.z = res.z;

    let gravityFactor = 10;
    let systemInfo = wx.getSystemInfoSync();
    let windowWidth = systemInfo.windowWidth;
    let windowHeight = systemInfo.windowHeight;
    if (windowHeight < windowWidth) {
      // landscape view
      let tmp = resCpy.x;
      resCpy.x = resCpy.y;
      resCpy.y = tmp;
      
      resCpy.x *= gravityFactor;
      resCpy.y *= -gravityFactor;
  
      // TODO adjust x y axis when the view flips upside down
    }
    else {
      // portrait view
      resCpy.x *= -gravityFactor;
      resCpy.y *= -gravityFactor;
    }
    deviceMotionEvent.accelerationIncludingGravity = resCpy;
  
    document.dispatchEvent(deviceMotionEvent);
  });
}

let unregisterFunc = _cc.inputManager._unregisterAccelerometerEvent.bind(_cc.inputManager);
_cc.inputManager._unregisterAccelerometerEvent = function () {
  // unregister engine AccelerationEventListener
  unregisterFunc();

  wx.stopAccelerometer && wx.stopAccelerometer({
    fail: function () {
      cc.error('unregister AccelerometerEvent failed !');
    },
    success: function () {}, 
    complete: function () {},
  });
}