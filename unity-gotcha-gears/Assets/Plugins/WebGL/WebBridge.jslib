mergeInto(LibraryManager.library, {
    OnGotchaGearsReady: function () {
        console.log("[WebBridge.jslib] Dispatching unityGotchaGearsReady");
        var event = new CustomEvent("unityGotchaGearsReady");
        window.dispatchEvent(event);
    },

    OnGotchaGearsComplete: function (jsonPtr) {
        var jsonString = UTF8ToString(jsonPtr);
        console.log("[WebBridge.jslib] Dispatching unityGotchaGearsComplete:", jsonString);
        try {
            var detail = JSON.parse(jsonString);
            var event = new CustomEvent("unityGotchaGearsComplete", { detail: detail });
            window.dispatchEvent(event);
        } catch (e) {
            console.error("[WebBridge.jslib] Failed to parse completion JSON:", e);
        }
    }
});
