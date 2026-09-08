import test from "node:test";
import assert from "node:assert/strict";
import { BOOKS, getBook, pageReadSeconds } from "../games/library.js";

test("Library includes ten complete original children's books", () => {
  assert.equal(BOOKS.length, 10);
  assert.equal(new Set(BOOKS.map((book) => book.id)).size, 10);
  for (const book of BOOKS) {
    assert.ok(book.title.length > 4, "book needs a title");
    assert.ok(book.coverLine.length > 10, "book needs cover copy");
    assert.equal(book.pages.length, 5, `${book.title} should have five pages`);
    for (const page of book.pages) {
      assert.ok(page.text.split(/\s+/).length >= 8, "page text is too thin");
      assert.ok(page.art, "page needs an art cue");
    }
  }
});

test("Book lookup and read-aloud timing stay predictable", () => {
  assert.equal(getBook("sock-rocket").title, "The Sock Rocket");
  assert.equal(getBook("missing-book"), null);
  assert.equal(pageReadSeconds("one two three") >= 2.8, true);
  assert.equal(
    pageReadSeconds("one ".repeat(80)) <= 7.5,
    true,
    "long pages should not stall auto-turn",
  );
});
