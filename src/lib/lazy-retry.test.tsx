import { act, render, screen } from "@testing-library/react";
import { Component, Suspense, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { lazyRoute } from "./lazy-retry";

/** Keeps expected lazy-load failures from failing the test process. */
class SwallowBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>BOUNDARY</p> : this.props.children;
  }
}

function resetStorage() {
  sessionStorage.clear();
}

/** jsdom forbids spying on location.assign — swap the whole object instead. */
function stubAssign() {
  const assign = vi.fn();
  vi.stubGlobal(
    "location",
    Object.defineProperties(Object.create(null), {
      ...Object.getOwnPropertyDescriptors(window.location),
      assign: { value: assign, writable: true },
      href: { value: window.location.href, writable: true },
    }),
  );
  return assign;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderNode(node: ReactElement) {
  return render(
    <SwallowBoundary>
      <Suspense fallback={<p>LOADING</p>}>{node}</Suspense>
    </SwallowBoundary>,
  );
}

describe("lazyRoute", () => {
  it("renders the resolved route component", async () => {
    resetStorage();
    const Page = lazyRoute("ok", async () => ({ default: () => <p>PAGE_OK</p> }));
    renderNode(<Page />);
    expect(await screen.findByText("PAGE_OK")).toBeInTheDocument();
    expect(sessionStorage.getItem("chunk-retry:ok")).toBeNull();
  });

  it("hard-reloads once when a chunk fails to load (stale deploy race)", async () => {
    resetStorage();
    const assign = stubAssign();
    const loader = vi.fn(async () => {
      throw new SyntaxError("Unexpected token '<'");
    });
    const Page = lazyRoute("stale", loader as never);

    renderNode(<Page />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(assign).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("chunk-retry:stale")).toBe("1");
  });

  it("never reload-loops: a second failure rethrows instead of reloading", async () => {
    resetStorage();
    sessionStorage.setItem("chunk-retry:loop", "1");
    const assign = stubAssign();
    const loader = vi.fn(async () => {
      throw new Error("still broken");
    });
    const Page = lazyRoute("loop", loader as never);

    renderNode(<Page />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(assign).not.toHaveBeenCalled();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("clears the retry flag after a successful recovery load", async () => {
    resetStorage();
    sessionStorage.setItem("chunk-retry:recover", "1");
    const Page = lazyRoute("recover", async () => ({ default: () => <p>RECOVERED</p> }));
    renderNode(<Page />);
    expect(await screen.findByText("RECOVERED")).toBeInTheDocument();
    expect(sessionStorage.getItem("chunk-retry:recover")).toBeNull();
  });
});
