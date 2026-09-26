import { describe, expect, it } from "vitest";
import { escapeHtml, markdownToPlain, renderMarkdown } from "./markdown";

describe("renderMarkdown — XSS", () => {
  it("escapes raw HTML", () => {
    const out = renderMarkdown(
      '<script>alert("x")</script><img src=x onerror=alert(1)>',
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });

  it("refuses javascript:, data: and vbscript: links", () => {
    for (const url of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,x",
      "vbscript:x",
    ]) {
      const out = renderMarkdown(`[click](${url})`);
      expect(out).not.toContain("<a");
      expect(out).toContain("click");
    }
  });

  it("does not allow breaking out of the href attribute", () => {
    const out = renderMarkdown('[x](https://a.example/"onmouseover="alert(1))');
    expect(out).not.toMatch(/<a[^>]*\sonmouseover=/i);
    // The quote stays inside the attribute as an entity.
    expect(out).toMatch(
      /<a href="https:\/\/a\.example\/&quot;onmouseover=&quot;[^"]*" target=/,
    );
  });

  it("escapes quotes inside bare URLs", () => {
    const out = renderMarkdown('https://a.example/"><script>x</script>');
    expect(out).not.toContain("<script");
    expect(out).not.toMatch(/<a[^>]*"><script/);
  });

  it("escapes HTML inside formatting and headings", () => {
    const out = renderMarkdown("# <b>t</b>\n**<i>x</i>** and `<u>`");
    expect(out).not.toMatch(/<(b|i|u)>/);
  });

  it("strips NUL placeholders from input", () => {
    const out = renderMarkdown("\u00000\u0000 text");
    expect(out).not.toContain("undefined");
    expect(out).not.toContain("\u0000");
  });

  it("escapeHtml handles all special characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("renderMarkdown — formatting", () => {
  it("renders paragraphs with line breaks", () => {
    expect(renderMarkdown("a\nb\n\nc")).toBe("<p>a<br>b</p>\n<p>c</p>");
  });

  it("maps headings down one level (page title is h1)", () => {
    expect(renderMarkdown("# One\n## Two\n### Three\n#### Four")).toBe(
      "<h2>One</h2>\n<h3>Two</h3>\n<h4>Three</h4>\n<h4>Four</h4>",
    );
  });

  it("renders bold and italic", () => {
    expect(renderMarkdown("**b** *i* __B__ _I_")).toBe(
      "<p><strong>b</strong> <em>i</em> <strong>B</strong> <em>I</em></p>",
    );
  });

  it("leaves snake_case identifiers alone", () => {
    expect(renderMarkdown("my_var_name")).toBe("<p>my_var_name</p>");
  });

  it("renders lists", () => {
    expect(renderMarkdown("- a\n- b\n\n1. x\n2. y")).toBe(
      "<ul><li>a</li><li>b</li></ul>\n<ol><li>x</li><li>y</li></ol>",
    );
  });

  it("renders safe links", () => {
    expect(renderMarkdown("[AIS](https://example.com/a?b=1&c=2)")).toBe(
      '<p><a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer nofollow">AIS</a></p>',
    );
    expect(renderMarkdown("[mail](mailto:a@example.com)")).toContain(
      'href="mailto:a@example.com"',
    );
  });

  it("autolinks bare URLs without trailing punctuation", () => {
    expect(renderMarkdown("See https://example.com.")).toBe(
      '<p>See <a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">https://example.com</a>.</p>',
    );
  });

  it("does not format inside code spans or URLs", () => {
    expect(renderMarkdown("`*x*`")).toBe("<p><code>*x*</code></p>");
    expect(renderMarkdown("https://example.com/a_b_c")).toContain(
      ">https://example.com/a_b_c</a>",
    );
  });

  it("returns empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
    expect(renderMarkdown(null)).toBe("");
  });
});

describe("markdownToPlain", () => {
  it("strips syntax and truncates", () => {
    expect(markdownToPlain("# Title\n**Bold** [link](https://x.y) _it_")).toBe(
      "Title Bold link it",
    );
    expect(markdownToPlain("abcdefghij", 5)).toBe("abcd…");
  });
});
