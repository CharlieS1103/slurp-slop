// SLURPSLOP Namespace bootstrap
(() => {
  const NS = (window.SlurpSlop = window.SlurpSlop || {});
  NS.version = NS.version || '2.x-dev';
  /*
  // If you want shared mutable values, you need to define them here first
  // imports and function declarations need to be added to the namespace as well.
  // i.e to import you simply make a call within the namespace like
  //  selectors = NS.selectors || {};
  // as all the files will be bundled together into one, the imports and exports are rather strange
  // to export, which is needed for any function called from a file outside of it's own
  // just use Object.assign
  i did a ton of individual comments only to do a multiline regardless
  */
  NS.state = NS.state || {};
  NS.config = NS.config || {};
  NS.utils = NS.utils || {};
})();
