// tests/outletFromDomain.test.ts
import { describe, it, expect } from "vitest";
import { getRegistrableDomain, outletFromDomain } from "../src/lib/outlets";

describe("getRegistrableDomain", () => {
  it("handles simple domains", () => {
    expect(getRegistrableDomain("nytimes.com")).toBe("nytimes.com");
    expect(getRegistrableDomain("reuters.com")).toBe("reuters.com");
  });

  it("handles subdomains", () => {
    expect(getRegistrableDomain("news.yahoo.com")).toBe("yahoo.com");
    expect(getRegistrableDomain("edition.cnn.com")).toBe("cnn.com");
  });

  it("handles multi-level ccTLDs correctly", () => {
    expect(getRegistrableDomain("bbc.co.uk")).toBe("bbc.co.uk");
    expect(getRegistrableDomain("something.gov.uk")).toBe("something.gov.uk");
    expect(getRegistrableDomain("news.com.au")).toBe("news.com.au");
  });

  it("falls back gracefully", () => {
    expect(getRegistrableDomain("localhost")).toBe("localhost");
    expect(getRegistrableDomain("")).toBe("");
  });
});

describe("outletFromDomain", () => {
  it("maps known outlets", () => {
    expect(outletFromDomain("nytimes.com")).toBe("New York Times");
    expect(outletFromDomain("bbc.co.uk")).toBe("BBC News");
    expect(outletFromDomain("reuters.com")).toBe("Reuters");
    expect(outletFromDomain("latimes.com")).toBe("Los Angeles Times");
    expect(outletFromDomain("axios.com")).toBe("Axios");
  });

  it("falls back to title-case", () => {
    expect(outletFromDomain("techcrunch.com")).toBe("Techcrunch");
    expect(outletFromDomain("my-weird-blog.net")).toBe("My Weird Blog");
  });

  it("handles subdomains", () => {
    expect(outletFromDomain("news.yahoo.com")).toBe("Yahoo");
    expect(outletFromDomain("abcnews.go.com")).toBe("ABC News");
  });

  it("handles ccTLD outlets", () => {
    expect(outletFromDomain("bbc.co.uk")).toBe("BBC News");
    expect(outletFromDomain("smh.com.au")).toBe("Smh");
  });
});

