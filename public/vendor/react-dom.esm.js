/**
 * ESM shim — exposes the host app's ReactDOM to dynamic widgets.
 */
const ReactDOM = window.__SHARED_REACT_DOM__;
export default ReactDOM;
export const { createPortal, flushSync, render, hydrate, createRoot, hydrateRoot } = ReactDOM || {};
