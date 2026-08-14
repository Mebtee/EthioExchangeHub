import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

// Initialize i18next synchronously (resources bundled, initAsync: false) so
// t()/Trans return real strings instead of raw keys in component tests.
import "@/i18n";

afterEach(() => {
  cleanup();
});
