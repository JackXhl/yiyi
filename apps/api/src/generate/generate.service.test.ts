import { describe, expect, it } from "vitest";
import { canGenerate, type Anchor } from "@yiyi/shared";
import {
  buildLayout,
  jobNodesFromConfig,
  longHtmlFromProse,
  longHtmlWithImages,
  machineCheck,
  noteTextWithOrder,
  orderImages,
  ownedLayout,
  stripClicheSentences,
  stripModelText,
} from "./generate.service";

const anchors: Anchor[] = [
  { id: "1", text: "上周三晚上店里灯管一直闪，客人说看菜单费劲", confirmed: true },
  { id: "2", text: "我自己爬梯子换了灯管，换完前台不再闪", confirmed: true },
];

describe("generate gate", () => {
  it("rejects a single short anchor", () => {
    const r = canGenerate({
      subActive: true,
      quotaLeft: 1,
      anchors: [{ id: "1", text: "abc", confirmed: true }],
    });
    expect(r.ok).toBe(false);
  });
});

describe("layout", () => {
  it("puts first image as cover and later images into the long html", () => {
    const assets = [
      { id: "img1", kind: "image", path: "a.jpg", analysis: { caption: "灯管" } },
      { id: "img2", kind: "image", path: "b.jpg", analysis: { caption: "梯子" } },
    ];
    const layout = buildLayout(assets);
    expect(layout.long.coverId).toBe("img1");
    expect(layout.note.order).toEqual(["img1", "img2"]);
    const html = longHtmlWithImages("换灯管", anchors, assets, layout);
    expect(html).toContain('/uploads/a.jpg');
    expect(html).toContain('/uploads/b.jpg');
    expect(html).toContain("上周三晚上店里灯管一直闪");
  });

  it("warns when there are images but no img tags", () => {
    const issues = machineCheck("<p>只有字</p>", "intent.story", anchors, 2);
    expect(issues.some((i) => i.text.includes("还没排进去"))).toBe(true);
  });

  it("tells note copy to upload in order", () => {
    expect(noteTextWithOrder("换灯管", anchors, 2)).toContain("第 1 张");
  });

  it("orders copy-pack images by layout, not upload sort", () => {
    const assets = [
      { id: "img1", kind: "image", path: "a.jpg" },
      { id: "img2", kind: "image", path: "b.jpg" },
    ];
    const ordered = orderImages(assets, ["img2", "img1"]);
    expect(ordered.map((a) => a.id)).toEqual(["img2", "img1"]);
  });

  it("uses stripped model prose instead of dumping HTML", () => {
    const assets = [{ id: "img1", kind: "image", path: "a.jpg", analysis: { caption: "灯管" } }];
    const layout = buildLayout(assets);
    const html = longHtmlFromProse(
      `<script>x()</script>我把店里闪了两周的灯管换了，客人说看菜单终于不费劲。梯子有点晃，我一只手扶墙。换完前台不再闪。`,
      "换灯管",
      anchors,
      assets,
      layout,
    );
    expect(html).not.toContain("script");
    expect(html).toContain("灯管换了");
    expect(html).toContain("/uploads/a.jpg");
  });

  it("strips tags from model text", () => {
    expect(stripModelText("<p>现场</p>")).toBe("现场");
  });

  it("falls back when the model returns a short filler line", () => {
    const html = longHtmlFromProse("好的我知道了谢谢", "换灯管", anchors, [], buildLayout([]));
    expect(html).toContain("上周三晚上店里灯管一直闪");
    expect(html).not.toContain("好的我知道了谢谢");
  });

  it("keeps a short but real model sentence instead of the template", () => {
    const html = longHtmlFromProse(
      "我周三晚上在店里更换了闪动的灯管，换完后前台的灯不再闪烁。",
      "换灯管",
      anchors,
      [],
      buildLayout([]),
    );
    expect(html).toContain("前台的灯不再闪烁");
    expect(html).not.toContain("以上都是我自己碰到的事");
  });

  it("strips cliche sentences before using model prose", () => {
    expect(stripClicheSentences("灯管闪了。不仅如此。客人说亮了。")).toBe("灯管闪了。客人说亮了。");
  });

  it("drops layout ids that are not this article's images", () => {
    const assets = [{ id: "img1", kind: "image", path: "a.jpg", analysis: null }];
    const layout = ownedLayout(
      {
        long: { coverId: "gone", slots: [{ assetId: "gone", caption: "" }, { assetId: "img1", caption: "灯" }] },
        note: { order: ["gone", "img1"] },
      },
      assets,
    );
    expect(layout.note.order).toEqual(["img1"]);
    expect(layout.long.coverId).toBe("img1");
  });

  it("flags missing confirmed facts in the check list", () => {
    const issues = machineCheck("<p>随便写两句现场。</p>", "intent.story", anchors, 0);
    expect(issues.some((i) => i.text.includes("未写进成稿"))).toBe(true);
  });

  it("always runs the four job nodes even if the config table is partial", () => {
    expect(jobNodesFromConfig([]).map((n) => n.node)).toEqual(["outline", "body", "adapt", "check"]);
    expect(
      jobNodesFromConfig([
        { node: "body", runMode: "ai_auto", contextCheck: true, contentCheck: true },
      ]).map((n) => n.node),
    ).toEqual(["outline", "body", "adapt", "check"]);
  });
});
