mergeInto(LibraryManager.library, {
  OnUnityMatchOver: function (jsonPtr) {
    var json = UTF8ToString(jsonPtr);
    console.log("[Unity] Match Over:", json);

    // Dispatch custom event for React to listen to
    if (typeof window !== "undefined") {
      var event = new CustomEvent("unityMatchOver", {
        detail: JSON.parse(json),
      });
      window.dispatchEvent(event);
    }
  },

  OnUnityReady: function () {
    console.log("[Unity] Ready");

    // Dispatch custom event for React to listen to
    if (typeof window !== "undefined") {
      var event = new CustomEvent("unityReady");
      window.dispatchEvent(event);

      // Mark Unity as ready on window object
      window.unityReady = true;
    }
  },
});
