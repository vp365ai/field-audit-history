// renderHook.ts — Minimal renderHook shim for React 16
import * as React from "react";
import { render, act } from "@testing-library/react";

interface RenderHookResult<T> {
    result: { current: T };
    rerender: () => void;
    unmount: () => void;
}

export function renderHook<T>(hookFn: () => T): RenderHookResult<T> {
    const resultRef: { current: T } = { current: undefined as unknown as T };

    function TestComponent(): null {
        resultRef.current = hookFn();
        return null;
    }

    const { rerender, unmount } = render(React.createElement(TestComponent));

    return {
        result: resultRef,
        rerender: () => {
            act(() => {
                rerender(React.createElement(TestComponent));
            });
        },
        unmount,
    };
}
