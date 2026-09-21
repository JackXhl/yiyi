import { describe, expect, it, vi } from "vitest";
import {
  canCopy,
  canGenerate,
  quotaSnapshot,
  sanitizeArticleHtml,
  acceptAssetFile,
  hitLimiter,
  InFlight,
  debounce,
  throttle,
  articlePatchSchema,
  mcpCallSchema,
  orderCreateSchema,
  htmlToPlain,
  pasteToPlain,
  plainToHtml,
  DAG_NODE_CONFIG_SEED,
  AI_JOB_NODES,
  canSetNodeRunMode,
  textCoversAnchors,
} from "./index";

describe("canGenerate", () => {
  it("blocks fewer than 2 confirmed anchors", () => {
    const r = canGenerate({
      subActive: true,
      quotaLeft: 3,
      anchors: [
        { id: "1", text: "上周三我在店里把灯管换了", confirmed: true },
        { id: "2", text: "太短", confirmed: true },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("事实依据");
  });

  it("allows two real confirmed anchors", () => {
    const r = canGenerate({
      subActive: true,
      quotaLeft: 1,
      anchors: [
        { id: "1", text: "上周三我在店里把灯管换了", confirmed: true },
        { id: "2", text: "换完后前台不再闪，客人说亮多了", confirmed: true },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("stops generate when subscription expired", () => {
    const r = canGenerate({
      subActive: false,
      quotaLeft: 99,
      anchors: [
        { id: "1", text: "上周三我在店里把灯管换了", confirmed: true },
        { id: "2", text: "换完后前台不再闪，客人说亮多了", confirmed: true },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("到期");
  });

  it("requires a real theme and a topic when those fields are supplied", () => {
    const anchors = [
      { id: "1", text: "上周三我在店里把灯管换了", confirmed: true },
      { id: "2", text: "换完后前台不再闪，客人说亮多了", confirmed: true },
    ];
    expect(
      canGenerate({ subActive: true, quotaLeft: 1, anchors, theme: "灯", topicCodes: ["topic.work"] }).ok,
    ).toBe(false);
    expect(
      canGenerate({
        subActive: true,
        quotaLeft: 1,
        anchors,
        theme: "我把店里闪了两周的灯管换了",
        topicCodes: [],
      }).reason,
    ).toContain("内容类目");
    expect(
      canGenerate({
        subActive: true,
        quotaLeft: 1,
        anchors,
        theme: "我把店里闪了两周的灯管换了",
        topicCodes: ["topic.work"],
      }).ok,
    ).toBe(true);
  });
});

describe("quotaSnapshot", () => {
  it("rolls used count when the monthly window ended", () => {
    const r = quotaSnapshot({
      quotaUsed: 40,
      monthlyQuota: 40,
      quotaResetAt: new Date("2026-01-01"),
      now: new Date("2026-02-02"),
    });
    expect(r.rolled).toBe(true);
    expect(r.quotaUsed).toBe(0);
    expect(r.quotaLeft).toBe(40);
  });
});

describe("sanitize and upload", () => {
  it("strips script handlers from article html", () => {
    const out = sanitizeArticleHtml(`<p onclick="alert(1)">灯</p><script>x()</script>`);
    expect(out).not.toContain("script");
    expect(out).not.toContain("onclick");
    expect(out).toContain("<p>灯</p>");
  });

  it("drops iframe and unsafe image sources", () => {
    const out = sanitizeArticleHtml(
      `<iframe src="https://evil.test"></iframe><img src="javascript:alert(1)" /><img src="/uploads/a.jpg" alt="灯" />`,
    );
    expect(out).not.toContain("iframe");
    expect(out).not.toContain("javascript");
    expect(out).toContain('/uploads/a.jpg');
  });

  it("rejects non-mp4 binaries", () => {
    expect(acceptAssetFile({ mimetype: "application/zip", size: 10 })).toContain("只收");
    expect(acceptAssetFile({ mimetype: "image/png", size: 100 })).toBeNull();
  });
});

describe("canCopy", () => {
  it("allows copy once the article is ready", () => {
    expect(canCopy({ status: "draft" }).ok).toBe(false);
    expect(canCopy({ status: "generating" }).ok).toBe(false);
    expect(canCopy({ status: "failed" }).ok).toBe(false);
    expect(canCopy({ status: "ready" }).ok).toBe(true);
  });
});

describe("dag node config", () => {
  it("seeds seven nodes with fill as human gate and later as ai auto", () => {
    expect(DAG_NODE_CONFIG_SEED).toHaveLength(7);
    expect(DAG_NODE_CONFIG_SEED.filter((r) => r.phase === "fill").every((r) => r.runMode === "ai_then_human")).toBe(true);
    expect(AI_JOB_NODES.every((n) => DAG_NODE_CONFIG_SEED.find((r) => r.node === n)?.runMode === "ai_auto")).toBe(true);
    expect(DAG_NODE_CONFIG_SEED.find((r) => r.node === "copy")?.runMode).toBe("human_approve");
  });

  it("forbids copy auto-publish", () => {
    expect(canSetNodeRunMode("copy", "ai_auto").ok).toBe(false);
    expect(canSetNodeRunMode("outline", "ai_then_human").ok).toBe(false);
    expect(canSetNodeRunMode("outline", "ai_auto").ok).toBe(true);
  });

  it("checks that draft text still contains confirmed anchors", () => {
    const anchors = [
      { id: "1", text: "上周三晚上店里灯管一直闪", confirmed: true },
      { id: "2", text: "我自己爬梯子换了灯管", confirmed: true },
    ];
    expect(textCoversAnchors("上周三晚上店里灯管一直闪。我自己爬梯子换了灯管。", anchors)).toBe(true);
    expect(textCoversAnchors("灯管坏了", anchors)).toBe(false);
    expect(
      textCoversAnchors("上周三晚上店里灯管一直闪。我自己爬梯子换了灯管。今天客人又来了。", [
        { id: "1", text: "上周三晚上店里灯管一直闪，客人说看菜单费劲", confirmed: true },
        { id: "2", text: "我自己爬梯子换了灯管，换完前台不再闪", confirmed: true },
      ]),
    ).toBe(true);
  });
});

describe("hitLimiter", () => {
  it("allows up to max hits then blocks inside the window", () => {
    const store = new Map<string, number[]>();
    expect(hitLimiter(store, "a@b.com", 3, 1000, 1000)).toBe(true);
    expect(hitLimiter(store, "a@b.com", 3, 1000, 1100)).toBe(true);
    expect(hitLimiter(store, "a@b.com", 3, 1000, 1200)).toBe(true);
    expect(hitLimiter(store, "a@b.com", 3, 1000, 1300)).toBe(false);
    expect(hitLimiter(store, "other@b.com", 3, 1000, 1300)).toBe(true);
  });

  it("rolls the window so old hits drop out", () => {
    const store = new Map<string, number[]>();
    hitLimiter(store, "k", 1, 1000, 0);
    expect(hitLimiter(store, "k", 1, 1000, 500)).toBe(false);
    expect(hitLimiter(store, "k", 1, 1000, 1001)).toBe(true);
  });
});

describe("InFlight", () => {
  it("rejects a second enter until leave", () => {
    const lock = new InFlight();
    expect(lock.enter("art1")).toBe(true);
    expect(lock.enter("art1")).toBe(false);
    expect(lock.enter("art2")).toBe(true);
    expect(lock.has("art1")).toBe(true);
    lock.leave("art1");
    expect(lock.has("art1")).toBe(false);
    expect(lock.enter("art1")).toBe(true);
  });
});

describe("debounce and throttle", () => {
  it("debounce only fires the last call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 200);
    d("a");
    d("b");
    vi.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("b");
    vi.useRealTimers();
  });

  it("throttle drops calls inside the wait window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const fn = vi.fn();
    const t = throttle(fn, 300);
    t("one");
    t("two");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("one");
    vi.setSystemTime(300);
    t("three");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("three");
    vi.useRealTimers();
  });
});

describe("payload schemas", () => {
  it("rejects oversized article patches and unknown node", () => {
    expect(() => articlePatchSchema.parse({ theme: "x".repeat(201) })).toThrow();
    expect(() => articlePatchSchema.parse({ currentNode: "publish" })).toThrow();
    expect(articlePatchSchema.parse({ theme: "换灯管", topicCodes: ["topic.work"] }).theme).toBe("换灯管");
    expect(() => articlePatchSchema.parse({ theme: "换灯管", extra: 1 })).toThrow();
  });

  it("rejects mcp publish and empty plan id", () => {
    expect(() => mcpCallSchema.parse({ tool: "publish" })).toThrow();
    expect(mcpCallSchema.parse({ tool: "read_article", args: { id: "a1" } }).tool).toBe("read_article");
    expect(() => orderCreateSchema.parse({ planId: "" })).toThrow();
    expect(orderCreateSchema.parse({ planId: "plan_trial" }).planId).toBe("plan_trial");
  });

  it("turns copied html into paste-safe plain text", () => {
    expect(htmlToPlain('<p>灯</p><img src="/uploads/a.jpg" alt="" /><p>亮</p>')).toContain("[图]");
    expect(htmlToPlain("<script>x()</script>灯")).toBe("灯");
  });

  it("rebuilds html from the plain editor without exposing tags", () => {
    const src = '<p>灯管闪了</p><p><img src="/uploads/a.jpg" alt="灯管" /></p><p>换完不闪</p>';
    const plain = htmlToPlain(src);
    expect(plain).not.toMatch(/<p>/);
    const back = plainToHtml(plain, src);
    expect(back).toContain("<p>灯管闪了</p>");
    expect(back).toContain('<img src="/uploads/a.jpg" alt="灯管" />');
    expect(back).toContain("<p>换完不闪</p>");
    expect(plainToHtml("第一段\n\n第二段")).toBe("<p>第一段</p><p>第二段</p>");
    expect(plainToHtml("<script>x()</script>")).toBe("<p>&lt;script&gt;x()&lt;/script&gt;</p>");
  });

  it("prefers clipboard plain text and strips pasted html", () => {
    expect(pasteToPlain({ text: "灯\n\n亮", html: "<p>别用这段</p>" })).toBe("灯\n\n亮");
    expect(pasteToPlain({ html: "<p>灯</p><script>x()</script><p>亮</p>" })).toBe("灯\n\n亮");
    expect(pasteToPlain({})).toBe("");
  });
});
