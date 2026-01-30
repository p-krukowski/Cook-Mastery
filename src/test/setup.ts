import "@testing-library/jest-dom/vitest";

// Some UI libs rely on matchMedia; provide a lightweight stub for jsdom.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) satisfies MediaQueryList) as typeof window.matchMedia;
}

