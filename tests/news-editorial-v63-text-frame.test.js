import test from "node:test";
import assert from "node:assert/strict";
import { getNewsEditorialTextFrame } from "../src/templates-v2/news-editorial-dynamic/config.js";

test("enquadramento reduz somente linhas internas quando três cards disputam altura", () => {
  assert.deepEqual(getNewsEditorialTextFrame({ orientation:"Paisagem", secondaryCount:3 }), {
    featuredTitleLines:5,
    featuredSummaryLines:4,
    secondaryTitleLines:3,
  });
  assert.deepEqual(getNewsEditorialTextFrame({ orientation:"Paisagem", secondaryCount:1 }), {
    featuredTitleLines:6,
    featuredSummaryLines:5,
    secondaryTitleLines:6,
  });
  assert.deepEqual(getNewsEditorialTextFrame({ orientation:"Retrato", secondaryCount:3 }), {
    featuredTitleLines:5,
    featuredSummaryLines:4,
    secondaryTitleLines:3,
  });
});
