mergeInto(LibraryManager.library, {
  OnBounceBudsReady: function () {
    console.log("[WebBridge.jslib] OnBounceBudsReady");

    var event = new CustomEvent("unityBounceBudsReady");
    window.dispatchEvent(event);
  },

  OnBounceBudsComplete: function (jsonPtr) {
    var json = UTF8ToString(jsonPtr);
    console.log("[WebBridge.jslib] OnBounceBudsComplete:", json);

    try {
      var data = JSON.parse(json);
      var event = new CustomEvent("unityBounceBudsComplete", {
        detail: {
          sessionId: data.sessionId,
          score: data.score,
          total: data.total,
          streakMax: data.streakMax,
          roundsCompleted: data.roundsCompleted,
        },
      });
      window.dispatchEvent(event);
    } catch (e) {
      console.error("[WebBridge.jslib] Failed to parse completion data:", e);
    }
  },
});
