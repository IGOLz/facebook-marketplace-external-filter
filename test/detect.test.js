// Run with: node --test test/
const test = require("node:test");
const assert = require("node:assert");
const { classifyHref } = require("../src/detect.js");

// Builds a grid link shaped like Facebook's, with commerce_rank_obj nested as a JSON string.
function link(id, rank) {
  const tracking = JSON.stringify({
    qid: "-1",
    mf_story_key: id,
    commerce_rank_obj: rank && JSON.stringify(rank),
  });
  const params = new URLSearchParams({
    ref: "browse_tab",
    referral_code: "",
    referral_story_type: "general_listing",
    tracking,
    __tn__: "!:D",
  });
  return `/marketplace/item/${id}/?${params}`;
}

test("partner listing by upsell type", () => {
  const id = "28405450732413124";
  const href = link(id, { target_id: id, target_type: 6, commerce_channel: 501, upsell_type: 212 });
  assert.strictEqual(classifyHref(href), "partner");
});

test("partner listing by retrieval source", () => {
  const id = "28956851440646572";
  const href = link(id, { target_id: id, upsell_type: 0, candidate_retrieval_source_map: { [id]: 5021 } });
  assert.strictEqual(classifyHref(href), "partner");
});

test("native listing", () => {
  const id = "1747167953012056";
  const href = link(id, {
    target_id: id,
    upsell_type: 129,
    candidate_retrieval_source_map: { "961925190008619": 3016, "2734834153578482": 3045 },
  });
  assert.strictEqual(classifyHref(href), "native");
});

test("link without ranking data is unknown", () => {
  assert.strictEqual(classifyHref(link("1128039556504115", null)), null);
  assert.strictEqual(classifyHref("/marketplace/item/1128039556504115/"), null);
});
