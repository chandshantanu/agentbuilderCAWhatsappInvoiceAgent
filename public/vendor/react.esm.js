/**
 * ESM shim — exposes the host app's React instance to dynamic widgets.
 * Dynamic widgets loaded via import() resolve "react" to this file
 * through the import map in index.html.
 */
const React = window.__SHARED_REACT__;
export default React;
export const {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  useReducer,
  useLayoutEffect,
  createElement,
  createContext,
  Fragment,
  Children,
  cloneElement,
  isValidElement,
  memo,
  forwardRef,
  lazy,
  Suspense,
  Component,
  PureComponent,
  StrictMode,
} = React;
