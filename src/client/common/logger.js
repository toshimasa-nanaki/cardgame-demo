const debugMode =
    location.search.substring(1) === "debug=true" ? true : false;
export const debugLog = debugMode ? console.log.bind(console) : () => {};
