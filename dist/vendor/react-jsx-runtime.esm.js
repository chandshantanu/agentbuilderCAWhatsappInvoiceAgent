/**
 * ESM shim — exposes the host app's JSX runtime to dynamic widgets.
 * esbuild with --jsx=automatic produces imports from "react/jsx-runtime".
 */
const React = window.__SHARED_REACT__;
export const jsx = React.createElement;
export const jsxs = React.createElement;
export const jsxDEV = React.createElement;
export const Fragment = React.Fragment;
