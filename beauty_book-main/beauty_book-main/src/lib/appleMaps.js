const MAPKIT_SCRIPT_URL = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";

let scriptPromise;
let initializationPromise;

function loadMapKitScript() {
  if (window.mapkit) return Promise.resolve(window.mapkit);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = MAPKIT_SCRIPT_URL;
    script.async = true;
    script.dataset.beautybookMapkit = "true";
    script.onload = () => {
      if (window.mapkit) resolve(window.mapkit);
      else reject(new Error("Apple Maps JS loaded without exposing mapkit."));
    };
    script.onerror = () => reject(new Error("Unable to load Apple Maps JS."));
    document.head.appendChild(script);
  }).catch((error) => {
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

function initializeMapKit(mapkit, token) {
  if (initializationPromise) return initializationPromise;

  initializationPromise = new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      finishWithError(new Error("Apple Maps authorization timed out."));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      mapkit.removeEventListener("configuration-change", onConfigurationChange);
      mapkit.removeEventListener("error", onConfigurationError);
    }

    function finishWithError(error) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    }

    function onConfigurationChange(event) {
      if (event.status !== "Initialized" && event.status !== "Refreshed") return;
      if (settled) return;
      settled = true;
      cleanup();
      resolve(mapkit);
    }

    function onConfigurationError(event) {
      finishWithError(new Error(`Apple Maps authorization failed (${event.status || "unknown"}).`));
    }

    mapkit.addEventListener("configuration-change", onConfigurationChange);
    mapkit.addEventListener("error", onConfigurationError);

    try {
      mapkit.init({
        authorizationCallback: (done) => done(token),
        language: "fr",
      });
    } catch (error) {
      finishWithError(error);
    }
  }).catch((error) => {
    initializationPromise = null;
    throw error;
  });

  return initializationPromise;
}

export function loadAppleMaps() {
  const token = import.meta.env.VITE_APPLE_MAPS_TOKEN?.trim();
  if (!token) {
    return Promise.reject(new Error("VITE_APPLE_MAPS_TOKEN is not configured."));
  }

  return loadMapKitScript().then((mapkit) => initializeMapKit(mapkit, token));
}
