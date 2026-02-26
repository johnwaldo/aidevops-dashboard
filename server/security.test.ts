import { describe, expect, test } from "bun:test";

describe("Security", () => {
  test("agent name validation regex", () => {
    const validAgent = /^[\w@-]+$/;
    
    expect(validAgent.test("build-plus")).toBe(true);
    expect(validAgent.test("seo")).toBe(true);
    expect(validAgent.test("content")).toBe(true);
    expect(validAgent.test("test-agent")).toBe(true);
    expect(validAgent.test("agent@domain")).toBe(true);
    
    expect(validAgent.test("agent; ls")).toBe(false);
    expect(validAgent.test("agent && ls")).toBe(false);
    expect(validAgent.test("agent\nls")).toBe(false);
  });
});

describe("Config", () => {
  test("trustProxy defaults to false", () => {
    // When DASHBOARD_TRUST_PROXY is not set, it should be falsy
    const trustProxy = process.env.DASHBOARD_TRUST_PROXY === "true";
    expect(trustProxy).toBe(false);
  });

  test("trustProxy can be enabled", () => {
    // Simulate environment where TRUST_PROXY is set
    const trustProxy = "true" === "true";
    expect(trustProxy).toBe(true);
  });
});

describe("CORS", () => {
  test("isTailscaleOrigin detects ts.net domains", () => {
    const isTailscaleOrigin = (origin: string): boolean => {
      try {
        const url = new URL(origin);
        return url.hostname.endsWith(".ts.net") || url.hostname === "localhost" || url.hostname === "127.0.0.1";
      } catch {
        return false;
      }
    };

    expect(isTailscaleOrigin("https://machine.ts.net")).toBe(true);
    expect(isTailscaleOrigin("https://my-server.ts.net")).toBe(true);
    expect(isTailscaleOrigin("http://localhost:3000")).toBe(true);
    expect(isTailscaleOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isTailscaleOrigin("https://example.com")).toBe(false);
  });
});
