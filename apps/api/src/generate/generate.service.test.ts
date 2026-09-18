import { describe, expect, it } from "vitest";
import { canGenerate, type Anchor } from "@yiyi/shared";
import {
  buildLayout,
  longHtmlWithImages,
  machineCheck,
  noteTextWithOrder,
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
});
