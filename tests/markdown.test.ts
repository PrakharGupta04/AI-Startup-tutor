import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "@/components/markdown";

describe("Markdown rendering and security", () => {
  it("1. **bold** produces <strong>", () => {
    const html = renderToStaticMarkup(
      createElement(Markdown, null, "**bold**")
    );
    expect(html).toContain("<strong");
    expect(html).toContain(">bold</strong>");
  });

  it("2. <script>alert(1)</script> does not produce a <script element in the output", () => {
    const html = renderToStaticMarkup(
      createElement(Markdown, null, "<script>alert(1)</script>")
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)</script>");
  });

  it("3. [x](javascript:alert(1)) does not produce href=\"javascript:", () => {
    const html = renderToStaticMarkup(
      createElement(Markdown, null, "[x](javascript:alert(1))")
    );
    expect(html).not.toContain('href="javascript:');
  });

  it("4. a normal https:// link keeps its href", () => {
    const html = renderToStaticMarkup(
      createElement(Markdown, null, "[Example](https://example.com/test)")
    );
    expect(html).toContain('href="https://example.com/test"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
