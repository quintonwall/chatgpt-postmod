import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Equalizer } from "../src/Equalizer.tsx";

test("endpoint section distinguishes saved scripts from execution results", () => {
  const html = renderToStaticMarkup(
    createElement(Equalizer, {
      collections: [
        {
          id: "c",
          name: "API basics",
          tests: 3,
          pre: null,
          requests: 3,
          spec: null,
        },
      ],
      selected: ["c"],
    }),
  );
  assert.match(html, /Not run yet/);
  assert.match(html, /Saved test scripts are not displayed here/);
  assert.doesNotMatch(html, /0 endpoints/);
});

test("summary-only execution does not claim the collection has no tests", () => {
  const html = renderToStaticMarkup(
    createElement(Equalizer, {
      collections: [],
      selected: [],
      job: {
        id: "run",
        requestId: "r",
        workspaceId: "w",
        mode: "host",
        state: "completed",
        rows: [],
        createdAt: "now",
      },
    }),
  );
  assert.match(html, /no endpoint-level results/);
  assert.match(html, /does not mean the collections have no tests/);
});
