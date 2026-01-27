mergeInto(LibraryManager.library, {
  OnRhymeRideReady: function () {
    console.log("[WebBridge.jslib] OnRhymeRideReady");

    var event = new CustomEvent("unityRhymeRideReady");
    window.dispatchEvent(event);
  },

  OnRhymeRideComplete: function (jsonPtr) {
    var json = UTF8ToString(jsonPtr);
    console.log("[WebBridge.jslib] OnRhymeRideComplete:", json);

    try {
      var data = JSON.parse(json);
      var event = new CustomEvent("unityRhymeRideComplete", {
        detail: {
          sessionId: data.sessionId,
          score: data.score,
          total: data.total,
          streakMax: data.streakMax
        }
      });
      window.dispatchEvent(event);
    } catch (e) {
      console.error("[WebBridge.jslib] Failed to parse completion data:", e);
    }
  }
});
