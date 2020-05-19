const debugMode =
    location.search.substring(1) === "debug=true" ? true : false;
const debugLog = debugMode ? console.log.bind(console) : () => {};

export default 