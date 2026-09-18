import { htmlToPlain } from "@yiyi/shared";

export async function copyHtml(html: string) {
  const plain = htmlToPlain(html);
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return;
    }
  } catch {
    /* 无焦点或无权限时退回纯文本 */
  }
  await navigator.clipboard.writeText(html);
}

export async function copyPlain(text: string) {
  await navigator.clipboard.writeText(text);
}
