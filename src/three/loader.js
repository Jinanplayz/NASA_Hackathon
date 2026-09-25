// three.js is large, so it is downloaded as a separate file: in the background once the
// game has started (see BootScene), and at the latest when a 3D screen opens.
let promise = null;

export function loadThree() {
  if (!promise) {
    promise = import('./ThreeView.js')
      .then((m) => m.ThreeView)
      .catch((e) => {
        console.warn('3D viewer could not load:', e);
        promise = null; // try again next time
        return null;
      });
  }
  return promise;
}
