import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}
function getSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

/**
 * Returns false on the server and on the client's first (hydrating) render,
 * then true afterwards. Used to defer rendering anything that depends on
 * client-only state (localStorage, matchMedia, etc.) without the
 * setState-in-useEffect pattern.
 */
export function useMounted() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
