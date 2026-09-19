<template>
  <div class="studio" v-if="article">
    <nav class="studio-nav" aria-label="创作步骤">
      <div class="studio-phases">
        <button
          v-for="p in phases"
          :key="p.id"
          type="button"
          :class="{ now: phaseId === p.id }"
          :aria-pressed="phaseId === p.id"
          @click="setPhase(p.id)"
        >{{ p.label }}</button>
      </div>
      <div class="studio-steps">
        <button
          v-for="s in phaseSteps"
          :key="s.id"
          type="button"
          :class="{ now: node === s.id }"
          :aria-pressed="node === s.id"
          @click="setNode(s.id)"
        >{{ s.label }}</button>
      </div>
    </nav>
    <div class="studio-body">
      <div class="studio-editor">
        <div class="editor-paper">
          <section v-if="node === 'topic'">
            <p class="hint">请先选择体裁、意图和类目，再填写主题与两条事实依据。</p>
            <div class="field">
              <label>作品体裁</label>
              <div class="chips">
                <button v-for="o in options.form" :key="o.code" type="button" class="chip" :class="{ on: article.formCode === o.code }" :aria-pressed="article.formCode === o.code" @click="article.formCode = o.code">{{ o.labelZh }}</button>
              </div>
            </div>
            <div class="field">
              <label>创作意图</label>
              <div class="chips">
                <button v-for="o in options.intent" :key="o.code" type="button" class="chip" :class="{ on: article.intentCode === o.code }" :aria-pressed="article.intentCode === o.code" @click="article.intentCode = o.code">{{ o.labelZh }}</button>
              </div>
            </div>
            <div class="field">
              <label>内容类目</label>
              <div class="chips">
                <button v-for="o in options.topicL1" :key="o.code" type="button" class="chip" :class="{ on: article.topicCodes?.includes(o.code) }" :aria-pressed="article.topicCodes?.includes(o.code)" @click="toggleTopic(o.code)">{{ o.labelZh }}</button>
              </div>
              <p class="hint">
                <button type="button" class="chip" :class="{ on: moreTopics }" :aria-expanded="moreTopics" @click="moreTopics = !moreTopics">更多类目</button>
              </p>
              <div class="chips" v-if="moreTopics">
                <button v-for="o in options.topicMore" :key="o.code" type="button" class="chip" :class="{ on: article.topicCodes?.includes(o.code) }" :aria-pressed="article.topicCodes?.includes(o.code)" @click="toggleTopic(o.code)">{{ o.labelZh }}</button>
              </div>
            </div>
            <div class="field">
              <label>作品主题</label>
              <t-input v-model="article.theme" placeholder="例如：我把店里那根闪了两周的灯管换了" />
            </div>
            <div class="field" v-for="(a, i) in article.anchors" :key="a.id">
              <label>事实依据 {{ i + 1 }}（亲历、可核对）</label>
              <t-textarea v-model="a.text" :autosize="{ minRows: 2 }" placeholder="请填写你亲历且可核对的具体事实" @change="a.confirmed = a.text.trim().length >= 4" />
            </div>
            <p class="hint">风格默认系统，可不改。</p>
            <div class="chips" v-if="styles.length">
              <button
                v-for="s in styles"
                :key="s.code"
                type="button"
                class="chip"
                :class="{ on: (article.styleCode || 'system') === s.code }"
                :aria-pressed="(article.styleCode || 'system') === s.code"
                @click="article.styleCode = s.code"
              >{{ s.labelZh }}</button>
            </div>
            <p class="err" v-if="gateReason">{{ gateReason }}</p>
          </section>

          <section v-if="node === 'media'">
            <div
              class="upload"
              :class="{ over: dragging }"
              @dragover.prevent="dragging = true"
              @dragleave="dragging = false"
              @drop.prevent="onDrop"
            >
              把现场照片或短视频拖到这里，或
              <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4" @change="onFiles" />
            </div>
            <div class="thumbs">
              <div class="card-asset" v-for="as in article.assets" :key="as.id">
                <img v-if="as.kind === 'image'" :src="as.url" alt="" />
                <div v-else class="ph">短视频</div>
                <p class="hint">{{ as.analysis?.caption }}</p>
                <t-button size="small" theme="primary" variant="outline" @click="confirmAsset(as.id)">用作事实依据</t-button>
              </div>
            </div>
            <p class="err" v-if="gateReason">{{ gateReason }}</p>
            <p class="err" v-if="uploadErr">{{ uploadErr }}</p>
            <p class="err" v-if="runErr">{{ runErr }}</p>
            <p class="hint" v-if="article.status === 'generating'">正在生成大纲与正文</p>
            <div class="progress" v-if="article.status === 'generating'" />
          </section>

          <section v-if="node === 'outline'">
            <label>大纲（可改，不强制通过）</label>
            <t-textarea v-model="article.outline" :autosize="{ minRows: 16 }" />
            <p class="hint" style="margin-top: 12px">结构先于文采。想直接看正文就点底栏「看正文」。</p>
          </section>

          <section v-if="node === 'body'">
            <label>长文（可改）</label>
            <PaperEditor v-model="bodyPlain" :original-html="article.bodyLong" />
            <p class="hint">空行分段。从网页粘贴时会去掉标签。右侧是公众号里读者看到的样子。</p>
          </section>

          <section v-if="node === 'adapt'">
            <label>笔记文案</label>
            <t-textarea v-model="article.bodyNote" :autosize="{ minRows: 8 }" />
            <p class="hint">请按此顺序在小红书后台上传图片。本产品不代为发表。可上移或移除某张。</p>
            <div class="thumbs">
              <div class="card-asset" v-for="(as, i) in imageAssets" :key="as.id">
                <img :src="as.url" alt="" />
                <p class="hint">第 {{ i + 1 }} 张{{ i === 0 ? " · 封面" : "" }}</p>
                <p>
                  <t-button size="small" variant="outline" :disabled="i === 0" @click="moveAsset(i, -1)">上移</t-button>
                  <t-button size="small" variant="outline" @click="dropAsset(as.id)">拿掉</t-button>
                </p>
              </div>
            </div>
          </section>

          <section v-if="node === 'check' || node === 'copy'">
            <div class="check-item" v-for="(c, i) in report" :key="i">
              {{ c.level === "high" ? "高风险" : c.level === "warn" ? "注意" : "说明" }} · {{ c.text }}
            </div>
            <t-checkbox v-model="article.disclosureAck">我已在该站按平台规则做 AI 生成声明</t-checkbox>
            <t-checkbox v-if="highRisk" v-model="article.highRiskAck">已知晓仍复制</t-checkbox>
            <p class="hint">公众号会过滤外链图片。请先粘贴文字，再按「渠道适配」中的顺序在后台上传图片。小红书请按笔记文案逐张上传。</p>
            <p class="err" v-if="copyErr">{{ copyErr }}</p>
          </section>
        </div>
      </div>
      <aside class="studio-stage">
        <div class="studio-stage-inner">
          <div class="chips" style="margin-top: 0">
            <button type="button" class="chip" :class="{ on: preview === 'note' }" :aria-pressed="preview === 'note'" @click="preview = 'note'">笔记</button>
            <button type="button" class="chip" :class="{ on: preview === 'mp' }" :aria-pressed="preview === 'mp'" @click="preview = 'mp'">公众号</button>
          </div>
          <DevicePreview
            :title="article.theme"
            :cover="coverUrl"
            :tags="previewTags"
            :note="stageNote"
            :mp="stageMp"
            :note-html="stageNoteHtml"
            :long-html="stageLongHtml"
            :empty-hint="stageHint"
          />
        </div>
      </aside>
    </div>
    <footer class="studio-dock">
      <template v-if="node === 'topic'">
        <t-button theme="primary" :disabled="!!gateReason" @click="go('media')">下一步</t-button>
      </template>
      <template v-else-if="node === 'media'">
        <t-button variant="outline" @click="setNode('topic')">上一步</t-button>
        <t-button theme="primary" :disabled="!!gateReason" :loading="running" @click="run">生成成稿</t-button>
      </template>
      <template v-else-if="node === 'outline'">
        <t-button theme="primary" @click="go('body')">看正文</t-button>
      </template>
      <template v-else-if="node === 'body'">
        <t-button theme="primary" @click="go('adapt')">去渠道适配</t-button>
      </template>
      <template v-else-if="node === 'adapt'">
        <t-button theme="primary" @click="go('check')">去合规检查</t-button>
      </template>
      <template v-else>
        <t-button variant="outline" :disabled="!canCopyNow" @click="copyText">只复制长文</t-button>
        <t-button variant="outline" :disabled="!canCopyNow" @click="copyOpen('note')">复制笔记并打开小红书</t-button>
        <t-button theme="primary" :disabled="!canCopyNow" @click="copyOpen('long')">复制长文并打开公众号</t-button>
      </template>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { canGenerate, DAG_NODES, DAG_NODE_LABEL, htmlToPlain, InFlight, plainToHtml, sanitizeArticleHtml } from "@yiyi/shared";
import { api } from "../api";
import { copyHtml, copyPlain } from "../clip";
import DevicePreview from "../components/DevicePreview.vue";
import PaperEditor from "../components/PaperEditor.vue";

type NodeId = (typeof DAG_NODES)[number];

const steps: { id: NodeId; label: string }[] = DAG_NODES.map((id) => ({ id, label: DAG_NODE_LABEL[id] }));
const phases = [
  { id: "fill" as const, label: "填写", nodes: ["topic", "media"] as NodeId[] },
  { id: "draft" as const, label: "成稿", nodes: ["outline", "body", "adapt"] as NodeId[] },
  { id: "copy" as const, label: "复制", nodes: ["check", "copy"] as NodeId[] },
];

type Opt = { code: string; labelZh: string };
type Article = {
  id: string;
  theme: string;
  formCode: string;
  intentCode: string;
  topicCodes: string[];
  anchors: { id: string; text: string; confirmed: boolean }[];
  outline: string;
  bodyLong: string;
  bodyNote: string;
  status: string;
  currentNode?: string;
  generateBlocked: string | null;
  quotaLeft?: number;
  subActive?: boolean;
  disclosureAck: boolean;
  highRiskAck: boolean;
  checkReport: { level: string; text: string }[];
  styleCode?: string;
  assets: { id: string; kind: string; url: string; analysis?: { caption?: string } }[];
  layout?: { long?: { coverId?: string | null }; note?: { order?: string[] } };
};

const route = useRoute();
const router = useRouter();
const article = ref<Article | null>(null);
const options = ref<{ form: Opt[]; intent: Opt[]; topicL1: Opt[]; topicMore: Opt[] }>({
  form: [],
  intent: [],
  topicL1: [],
  topicMore: [],
});
const node = ref<NodeId>("topic");
const preview = ref<"mp" | "note">("note");
const bodyPlain = ref("");
const moreTopics = ref(false);
const copyErr = ref("");
const uploadErr = ref("");
const runErr = ref("");
const dragging = ref(false);
const styles = ref<{ code: string; labelZh: string }[]>([]);
const running = ref(false);
const flight = new InFlight();

const phaseId = computed(() => phases.find((p) => p.nodes.includes(node.value))?.id ?? "fill");
const phaseSteps = computed(() => steps.filter((s) => (phases.find((p) => p.id === phaseId.value)?.nodes ?? []).includes(s.id)));

function isNode(v: unknown): v is NodeId {
  return typeof v === "string" && (DAG_NODES as readonly string[]).includes(v);
}

const gateReason = computed(() => {
  const a = article.value;
  if (!a) return "";
  return (
    canGenerate({
      anchors: a.anchors.map((x) => ({
        ...x,
        confirmed: x.confirmed || x.text.trim().length >= 4,
      })),
      quotaLeft: a.quotaLeft ?? 99,
      subActive: a.subActive !== false,
      theme: a.theme,
      topicCodes: a.topicCodes,
    }).reason ?? ""
  );
});

const report = computed(() => article.value?.checkReport ?? []);
const highRisk = computed(
  () => article.value?.intentCode === "intent.promo" || report.value.some((c) => c.level === "high"),
);
const canCopyNow = computed(() => {
  if (!article.value?.disclosureAck) return false;
  if (highRisk.value && !article.value.highRiskAck) return false;
  return true;
});
const noteHtml = computed(() => (article.value?.bodyNote || "").replace(/\n/g, "<br/>"));
const imageAssets = computed(() => {
  const all = (article.value?.assets || []).filter((a) => a.kind === "image");
  const order = article.value?.layout?.note?.order;
  if (!order?.length) return all;
  const byId = new Map(all.map((a) => [a.id, a]));
  return order.map((id) => byId.get(id)).filter((a): a is (typeof all)[number] => !!a);
});
const coverUrl = computed(() => imageAssets.value[0]?.url ?? null);
const previewTags = computed(() => {
  const a = article.value;
  if (!a) return [];
  const labels: string[] = [];
  const form = options.value.form.find((o) => o.code === a.formCode);
  const intent = options.value.intent.find((o) => o.code === a.intentCode);
  if (form) labels.push(form.labelZh);
  if (intent) labels.push(intent.labelZh);
  return labels;
});
const stageNote = computed(() => preview.value === "note");
const stageMp = computed(() => preview.value === "mp");
const stageNoteHtml = computed(() => sanitizeArticleHtml(noteHtml.value));
const stageLongHtml = computed(() => {
  if (node.value === "outline") {
    return sanitizeArticleHtml((article.value?.outline || "").replace(/\n/g, "<br/>"));
  }
  return sanitizeArticleHtml(plainToHtml(bodyPlain.value, article.value?.bodyLong || ""));
});
const stageHint = computed(() => {
  if (node.value === "topic") return "主题会显示在笔记封面下。";
  if (node.value === "media") return "上传现场图后，这里按 3:4 显示封面。";
  if (node.value === "adapt") return "右侧即小红书后台里读者看到的顺序。";
  return "生成成稿后在这里看预览。";
});

onMounted(async () => {
  options.value = await api("/api/topic-options");
  try {
    styles.value = (await api<{ items: { code: string; labelZh: string }[] }>("/api/styles")).items;
  } catch {
    styles.value = [{ code: "system", labelZh: "系统默认" }];
  }
  await openArticle();
});

watch(
  () => route.params.id,
  () => openArticle(),
);

watch(node, (n) => {
  if (!route.params.id) return;
  if (route.query.node === n) return;
  void router.replace({ params: route.params, query: { ...route.query, node: n } });
});

async function openArticle() {
  if (!route.params.id) {
    const data = await api<{ items: { id: string }[] }>("/api/articles");
    const last = data.items[0];
    if (last) {
      await router.replace({ path: `/write/${last.id}`, query: route.query });
      return;
    }
    await router.replace("/drafts");
    return;
  }
  await load();
}

async function load() {
  if (!route.params.id) return;
  article.value = await api(`/api/articles/${route.params.id}`);
  bodyPlain.value = htmlToPlain(article.value?.bodyLong || "");
  const selectedMore = (article.value?.topicCodes || []).some((c) => options.value.topicMore.some((o) => o.code === c));
  moreTopics.value = selectedMore;
  const fromQuery = route.query.node;
  const next = isNode(fromQuery) ? fromQuery : isNode(article.value?.currentNode) ? article.value.currentNode : "topic";
  node.value = next;
  preview.value = next === "outline" ? "mp" : "note";
}

function toggleTopic(code: string) {
  if (!article.value) return;
  const cur = article.value.topicCodes || [];
  if (cur.includes(code)) article.value.topicCodes = cur.filter((c) => c !== code);
  else article.value.topicCodes = [...cur, code].slice(0, 2);
}

async function setNode(next: NodeId) {
  await save();
  node.value = next;
  if (next === "outline") preview.value = "mp";
  else if (next === "adapt" || next === "topic" || next === "media") preview.value = "note";
}

async function setPhase(id: (typeof phases)[number]["id"]) {
  const p = phases.find((x) => x.id === id);
  if (!p) return;
  if (!p.nodes.includes(node.value)) await setNode(p.nodes[0]);
}

async function go(next: string) {
  if (!isNode(next)) return;
  await setNode(next);
}

async function save() {
  if (!article.value) return;
  if (!flight.enter("save")) return;
  try {
    article.value = await api(`/api/articles/${article.value.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        theme: article.value.theme,
        formCode: article.value.formCode,
        intentCode: article.value.intentCode,
        topicCodes: article.value.topicCodes,
        anchors: article.value.anchors,
        outline: article.value.outline,
        bodyLong: plainToHtml(bodyPlain.value, article.value.bodyLong),
        bodyNote: article.value.bodyNote,
        layout: article.value.layout,
        styleCode: article.value.styleCode || "system",
        currentNode: node.value,
        disclosureAck: article.value.disclosureAck,
        highRiskAck: article.value.highRiskAck,
      }),
    });
  } finally {
    flight.leave("save");
  }
}

async function run() {
  if (!flight.enter("run")) return;
  runErr.value = "";
  running.value = true;
  try {
    await save();
    if (!article.value) return;
    article.value = await api(`/api/articles/${article.value.id}/generate`, { method: "POST" });
    bodyPlain.value = htmlToPlain(article.value.bodyLong || "");
    node.value = "outline";
  } catch (e) {
    runErr.value = e instanceof Error ? e.message : "暂时无法生成成稿";
  } finally {
    running.value = false;
    flight.leave("run");
  }
}

async function uploadList(files: FileList | File[]) {
  if (!article.value) return;
  if (!flight.enter("upload")) return;
  uploadErr.value = "";
  try {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    const res = await fetch(`/api/articles/${article.value.id}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("yiyi.token") || ""}` },
      body: fd,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      uploadErr.value = (data as { message?: string }).message || "上传失败";
      return;
    }
    await load();
  } finally {
    flight.leave("upload");
  }
}

async function onFiles(ev: Event) {
  const files = (ev.target as HTMLInputElement).files;
  if (!files?.length) return;
  await uploadList(files);
}

function onDrop(ev: DragEvent) {
  dragging.value = false;
  const files = ev.dataTransfer?.files;
  if (!files?.length) return;
  void uploadList(files);
}

async function confirmAsset(id: string) {
  if (!article.value) return;
  await api(`/api/articles/${article.value.id}/assets/${id}/confirm`, {
    method: "POST",
    body: JSON.stringify({ asAnchor: true }),
  });
  await load();
}

async function dropAsset(id: string) {
  if (!article.value) return;
  const order = imageAssets.value.map((a) => a.id).filter((x) => x !== id);
  article.value.layout = {
    ...(article.value.layout || {}),
    long: { coverId: order[0] ?? null },
    note: { order },
  };
  await save();
}

async function moveAsset(index: number, dir: number) {
  if (!article.value) return;
  const imgs = imageAssets.value;
  const next = index + dir;
  if (next < 0 || next >= imgs.length) return;
  const ids = imgs.map((a) => a.id);
  const t = ids[index];
  ids[index] = ids[next];
  ids[next] = t;
  await api(`/api/articles/${article.value.id}/assets/reorder`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
  article.value.layout = {
    ...(article.value.layout || {}),
    long: { coverId: ids[0] ?? null },
    note: { order: ids },
  };
  await save();
}

async function copyOpen(kind: "long" | "note") {
  if (!flight.enter("copy")) return;
  copyErr.value = "";
  try {
    await save();
    const pack = await api<{
      longHtml: string;
      noteText: string;
      backends: { name: string; url: string; kind: string }[];
    }>(`/api/articles/${article.value!.id}/copy-pack`);
    if (kind === "note") {
      await copyPlain(pack.noteText);
      window.open(pack.backends.find((b) => b.kind === "note")?.url || "https://creator.xiaohongshu.com/", "_blank");
      return;
    }
    await copyHtml(pack.longHtml);
    window.open(pack.backends.find((b) => b.kind === "long")?.url || "https://mp.weixin.qq.com/", "_blank");
  } catch (e) {
    copyErr.value = e instanceof Error && /Clipboard|clipboard|NotAllowed/i.test(e.message)
      ? "复制失败，请再点一次"
      : e instanceof Error
        ? e.message
        : "不能复制";
  } finally {
    flight.leave("copy");
  }
}

async function copyText() {
  if (!flight.enter("copy")) return;
  copyErr.value = "";
  try {
    await save();
    const pack = await api<{ longHtml: string }>(`/api/articles/${article.value!.id}/copy-pack`);
    await copyHtml(pack.longHtml);
  } catch (e) {
    copyErr.value = e instanceof Error && /Clipboard|clipboard|NotAllowed/i.test(e.message)
      ? "复制失败，请再点一次"
      : e instanceof Error
        ? e.message
        : "不能复制";
  } finally {
    flight.leave("copy");
  }
}
</script>
