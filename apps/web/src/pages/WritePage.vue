<template>
  <div class="studio" v-if="article">
    <nav class="studio-nav" aria-label="创作步骤">
      <t-steps
        class="studio-journey"
        :current="phaseIndex"
        separator="line"
        @change="onStepChange"
      >
        <t-step-item
          v-for="(p, i) in phases"
          :key="p.id"
          :title="p.label"
          :content="p.hint"
          :status="stepStatus(i)"
        />
      </t-steps>
      <div class="studio-steps" v-if="phaseId === 'draft'">
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
          <ol class="job-steps" v-if="jobLocked" aria-label="生成进度">
            <li
              v-for="s in jobSteps"
              :key="s.id"
              :class="{ now: article.currentNode === s.id, done: jobPassed(s.id) }"
            >{{ s.label }}</li>
          </ol>
          <p class="hint" v-if="article.status === 'failed'">生成失败。改取材内容后，再点生成成稿。</p>

          <section v-if="phaseId === 'fill'">
            <p class="hint">先写下主题和现场事实，再点底栏生成成稿。后面的大纲、正文、适配由系统一次跑完。</p>
            <div class="field">
              <label>主题</label>
              <t-input v-model="article.theme" placeholder="例如：我把店里那根闪了两周的灯管换了" :disabled="jobLocked" />
            </div>
            <div class="field" v-for="(a, i) in article.anchors" :key="a.id">
              <label>事实 {{ i + 1 }}</label>
              <t-textarea
                v-model="a.text"
                :autosize="{ minRows: 2 }"
                :placeholder="i === 0 ? '上周三晚上店里灯管一直闪' : '换下来才看见镇流器已经发黑'"
                :disabled="jobLocked"
                @change="a.confirmed = a.text.trim().length >= 4"
              />
              <p class="hint">亲历、可核对。</p>
            </div>
            <div class="field">
              <label>现场照片或短视频</label>
              <div
                class="upload"
                :class="{ over: dragging }"
                @dragover.prevent="onDragOver"
                @dragleave="dragging = false"
                @drop.prevent="onDrop"
              >
                把照片或短视频拖到这里，或
                <label class="upload-pick">
                  <input
                    class="sr-only"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"
                    :disabled="jobLocked"
                    @change="onFiles"
                  />
                  选择照片或短视频
                </label>
              </div>
              <p class="err" v-if="uploadErr">{{ uploadErr }}</p>
              <div class="thumbs">
                <div class="card-asset" v-for="as in article.assets" :key="as.id">
                  <img v-if="as.kind === 'image'" :src="as.url" alt="" />
                  <div v-else class="ph">短视频</div>
                  <p class="hint">{{ as.analysis?.caption }}</p>
                  <t-button size="small" theme="primary" variant="outline" :disabled="jobLocked" @click="confirmAsset(as.id)">写进事实</t-button>
                </div>
              </div>
            </div>
            <div class="field">
              <label>选题</label>
              <div class="chips">
                <button v-for="o in options.form" :key="o.code" type="button" class="chip" :class="{ on: article.formCode === o.code }" :aria-pressed="article.formCode === o.code" :disabled="jobLocked" @click="article.formCode = o.code">{{ o.labelZh }}</button>
              </div>
              <div class="chips">
                <button v-for="o in options.intent" :key="o.code" type="button" class="chip" :class="{ on: article.intentCode === o.code }" :aria-pressed="article.intentCode === o.code" :disabled="jobLocked" @click="article.intentCode = o.code">{{ o.labelZh }}</button>
              </div>
              <div class="chips">
                <button v-for="o in options.topicL1" :key="o.code" type="button" class="chip" :class="{ on: article.topicCodes?.includes(o.code) }" :aria-pressed="article.topicCodes?.includes(o.code)" :disabled="jobLocked" @click="toggleTopic(o.code)">{{ o.labelZh }}</button>
                <button type="button" class="text-btn" :aria-expanded="moreTopics" :disabled="jobLocked" @click="moreTopics = !moreTopics">{{ moreTopics ? "收起类目" : "更多类目" }}</button>
              </div>
              <div class="chips" v-if="moreTopics">
                <button v-for="o in options.topicMore" :key="o.code" type="button" class="chip" :class="{ on: article.topicCodes?.includes(o.code) }" :aria-pressed="article.topicCodes?.includes(o.code)" :disabled="jobLocked" @click="toggleTopic(o.code)">{{ o.labelZh }}</button>
              </div>
            </div>
            <p>
              <button type="button" class="text-btn" :aria-expanded="moreOptions" :disabled="jobLocked" @click="moreOptions = !moreOptions">{{ moreOptions ? "收起选项" : "更多选项" }}</button>
            </p>
            <div class="field" v-if="moreOptions">
              <label>风格</label>
              <p class="hint">默认系统，可不改。</p>
              <div class="chips" v-if="styles.length">
                <button
                  v-for="s in styles"
                  :key="s.code"
                  type="button"
                  class="chip"
                  :class="{ on: (article.styleCode || 'system') === s.code }"
                  :aria-pressed="(article.styleCode || 'system') === s.code"
                  :disabled="jobLocked"
                  @click="article.styleCode = s.code"
                >{{ s.labelZh }}</button>
              </div>
            </div>
          </section>

          <section v-else-if="phaseId === 'draft' && article.status === 'draft'">
            <p class="hint">先在取材里确认主题和两条事实，再点生成成稿。</p>
          </section>

          <section v-else-if="node === 'outline'">
            <label>大纲</label>
            <p class="hint">{{ jobLocked ? "生成中，不能改。" : "可改；再生成会整条重跑。" }}</p>
            <t-textarea v-model="article.outline" :autosize="{ minRows: 16 }" :disabled="jobLocked" />
          </section>

          <section v-else-if="node === 'body'">
            <label>长文</label>
            <p class="hint">{{ jobLocked ? "生成中，不能改。" : "可改。空行分段。从网页粘贴时会去掉标签。右侧是公众号里读者看到的样子。" }}</p>
            <PaperEditor v-model="bodyPlain" :original-html="article.bodyLong" :locked="jobLocked" />
          </section>

          <section v-else-if="node === 'adapt'">
            <label>笔记文案</label>
            <t-textarea v-model="article.bodyNote" :autosize="{ minRows: 8 }" :disabled="jobLocked" />
            <p class="hint">请按此顺序在小红书后台上传图片。本产品不代为发表。可上移或拿掉某张。</p>
            <div class="thumbs">
              <div class="card-asset" v-for="(as, i) in imageAssets" :key="as.id">
                <img :src="as.url" alt="" />
                <p class="hint">第 {{ i + 1 }} 张{{ i === 0 ? " · 封面" : "" }}</p>
                <p>
                  <t-button size="small" variant="outline" :disabled="jobLocked || i === 0" @click="moveAsset(i, -1)">上移</t-button>
                  <t-button size="small" variant="outline" :disabled="jobLocked" @click="dropAsset(as.id)">拿掉</t-button>
                </p>
              </div>
            </div>
          </section>

          <section v-else-if="phaseId === 'copy'">
            <p>可以复制到各站后台了。</p>
            <div class="check-item" v-for="(c, i) in report" :key="i">
              {{ c.level === "high" ? "高风险" : c.level === "warn" ? "注意" : "说明" }} · {{ c.text }}
            </div>
            <p class="notice">{{ copyNotice }}</p>
            <p class="hint">公众号会过滤外链图片。请先粘贴文字，再按渠道适配中的顺序在后台上传图片。用底栏复制。</p>
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
      <p class="dock-reason" v-if="dockReason">{{ dockReason }}</p>
      <template v-if="phaseId === 'fill'">
        <t-button theme="primary" :disabled="!!gateReason || jobLocked" :loading="jobLocked || running" @click="run">{{ article.status === 'ready' ? '再生成成稿' : '生成成稿' }}</t-button>
      </template>
      <template v-else-if="jobLocked">
        <t-button theme="primary" disabled :loading="true">正在生成</t-button>
      </template>
      <template v-else-if="phaseId === 'draft'">
        <t-button variant="outline" :disabled="!!gateReason" :loading="running" @click="run">再生成成稿</t-button>
        <t-button theme="primary" :disabled="article.status !== 'ready'" @click="setPhase('copy')">去取稿</t-button>
      </template>
      <template v-else>
        <t-button variant="outline" :disabled="!canCopyNow" @click="copyText">复制长文</t-button>
        <t-button variant="outline" :disabled="!canCopyNow" @click="copyOpen('note')">复制笔记并打开小红书</t-button>
        <t-button theme="primary" :disabled="!canCopyNow" @click="copyOpen('long')">复制长文并打开公众号</t-button>
      </template>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  AI_JOB_NODES,
  canCopy,
  canGenerate,
  COPY_NOTICE,
  DAG_NODE_LABEL,
  DAG_NODES,
  htmlToPlain,
  InFlight,
  plainToHtml,
  sanitizeArticleHtml,
} from "@yiyi/shared";
import { api } from "../api";
import { copyHtml, copyPlain } from "../clip";
import DevicePreview from "../components/DevicePreview.vue";
import PaperEditor from "../components/PaperEditor.vue";

type NodeId = (typeof DAG_NODES)[number];

const steps: { id: NodeId; label: string }[] = DAG_NODES.map((id) => ({ id, label: DAG_NODE_LABEL[id] }));
const phases = [
  { id: "fill" as const, label: "取材", hint: "主题与现场", nodes: ["topic", "media"] as NodeId[] },
  { id: "draft" as const, label: "成稿", hint: "一次写完", nodes: ["outline", "body", "adapt"] as NodeId[] },
  { id: "copy" as const, label: "取稿", hint: "粘到后台", nodes: ["check", "copy"] as NodeId[] },
];
const jobSteps = AI_JOB_NODES.map((id) => ({ id, label: DAG_NODE_LABEL[id] }));
const copyNotice = COPY_NOTICE;

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
  checkReport: { level: string; text: string }[];
  styleCode?: string;
  assets: { id: string; kind: string; url: string; analysis?: { caption?: string } }[];
  layout?: { long?: { coverId?: string | null; slots?: { assetId: string }[] }; note?: { order?: string[] } };
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
const moreOptions = ref(false);
const copyErr = ref("");
const uploadErr = ref("");
const runErr = ref("");
const dragging = ref(false);
const styles = ref<{ code: string; labelZh: string }[]>([]);
const running = ref(false);
const flight = new InFlight();
let pollTimer: ReturnType<typeof setInterval> | undefined;
let loadSeq = 0;

const phaseId = computed(() => phases.find((p) => p.nodes.includes(node.value))?.id ?? "fill");
const phaseIndex = computed(() => Math.max(0, phases.findIndex((p) => p.id === phaseId.value)));
const phaseSteps = computed(() => steps.filter((s) => (phases.find((p) => p.id === phaseId.value)?.nodes ?? []).includes(s.id)));
const jobLocked = computed(() => article.value?.status === "generating");

function isNode(v: unknown): v is NodeId {
  return typeof v === "string" && (DAG_NODES as readonly string[]).includes(v);
}

function jobPassed(id: string) {
  const order = AI_JOB_NODES as readonly string[];
  const cur = article.value?.currentNode || "outline";
  return order.indexOf(id) < order.indexOf(cur);
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

const dockReason = computed(() => {
  if (jobLocked.value) return "";
  if (runErr.value) return runErr.value;
  if (phaseId.value === "fill" && gateReason.value) return gateReason.value;
  if (phaseId.value === "draft") {
    if (article.value?.status !== "ready") return "成稿完成后可取";
    if (gateReason.value) return gateReason.value;
  }
  return "";
});

const report = computed(() => article.value?.checkReport ?? []);
const canCopyNow = computed(() => canCopy({ status: article.value?.status || "" }).ok);
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
  if (phaseId.value === "fill") return "主题会显示在笔记封面下。";
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

onUnmounted(stopPoll);

watch(
  () => route.params.id,
  () => openArticle(),
);

watch(node, (n) => {
  if (!route.params.id) return;
  if (route.query.node === n) return;
  void router.replace({ params: route.params, query: { ...route.query, node: n } });
});

watch(
  () => article.value?.status,
  (status) => {
    if (status === "generating") startPoll();
    else stopPoll();
  },
);

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

function goCopy() {
  node.value = "copy";
  preview.value = "note";
}

async function load() {
  if (!route.params.id) return;
  const seq = ++loadSeq;
  const prev = article.value?.status;
  const data = await api(`/api/articles/${route.params.id}`);
  if (seq !== loadSeq) return;
  article.value = data;
  bodyPlain.value = htmlToPlain(article.value?.bodyLong || "");
  const selectedMore = (article.value?.topicCodes || []).some((c) => options.value.topicMore.some((o) => o.code === c));
  moreTopics.value = selectedMore;
  moreOptions.value = (article.value?.styleCode || "system") !== "system";
  if (article.value?.status === "generating") {
    const cur = article.value.currentNode;
    node.value = isNode(cur) && (phases[1].nodes as string[]).includes(cur) ? cur : "outline";
    preview.value = node.value === "outline" ? "mp" : "note";
    startPoll();
    return;
  }
  stopPoll();
  if (prev === "generating" && article.value?.status === "ready") {
    goCopy();
    return;
  }
  if (prev === "generating" && article.value?.status === "failed") {
    node.value = "topic";
    preview.value = "note";
    return;
  }
  const fromQuery = route.query.node;
  const next = isNode(fromQuery) ? fromQuery : isNode(article.value?.currentNode) ? article.value.currentNode : "topic";
  node.value = next;
  preview.value = next === "outline" ? "mp" : "note";
}

function startPoll() {
  if (pollTimer) return;
  if (article.value?.status !== "generating") return;
  pollTimer = setInterval(() => {
    void load();
  }, 2000);
}

function stopPoll() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = undefined;
}

function toggleTopic(code: string) {
  if (!article.value || jobLocked.value) return;
  const cur = article.value.topicCodes || [];
  if (cur.includes(code)) article.value.topicCodes = cur.filter((c) => c !== code);
  else article.value.topicCodes = [...cur, code].slice(0, 2);
}

async function setNode(next: NodeId) {
  if (jobLocked.value && phases[0].nodes.includes(next)) return;
  if (!jobLocked.value) await save();
  node.value = next;
  if (next === "outline") preview.value = "mp";
  else if (next === "adapt" || next === "topic" || next === "media") preview.value = "note";
}

async function setPhase(id: (typeof phases)[number]["id"]) {
  if (jobLocked.value && id !== "draft") return;
  const p = phases.find((x) => x.id === id);
  if (!p) return;
  if (!p.nodes.includes(node.value)) await setNode(p.nodes[0]);
}

function stepStatus(i: number): "default" | "process" | "finish" | "error" {
  if (article.value?.status === "failed" && i === 1 && phaseId.value === "draft") return "error";
  if (i < phaseIndex.value) return "finish";
  if (i === phaseIndex.value) return "process";
  return "default";
}

function onStepChange(current: string | number) {
  const i = typeof current === "number" ? current : Number(current);
  const p = phases[i];
  if (!p) return;
  if (jobLocked.value && p.id !== "draft") return;
  if (p.id === "copy" && article.value?.status !== "ready") return;
  void setPhase(p.id);
}

async function save() {
  if (!article.value || jobLocked.value) return;
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
    if (article.value.status === "ready") {
      goCopy();
      return;
    }
    node.value = "outline";
    preview.value = "mp";
    if (article.value.status === "generating") startPoll();
  } catch (e) {
    runErr.value = e instanceof Error ? e.message : "暂时无法生成成稿";
  } finally {
    running.value = false;
    flight.leave("run");
  }
}

async function uploadList(files: FileList | File[]) {
  if (!article.value || jobLocked.value) return;
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
  const input = ev.target as HTMLInputElement;
  const files = input.files;
  if (!files?.length) return;
  await uploadList(files);
  input.value = "";
}

function onDragOver() {
  if (jobLocked.value) return;
  dragging.value = true;
}

function onDrop(ev: DragEvent) {
  dragging.value = false;
  if (jobLocked.value) return;
  const files = ev.dataTransfer?.files;
  if (!files?.length) return;
  void uploadList(files);
}

async function confirmAsset(id: string) {
  if (!article.value || jobLocked.value) return;
  await api(`/api/articles/${article.value.id}/assets/${id}/confirm`, {
    method: "POST",
    body: JSON.stringify({ asAnchor: true }),
  });
  await load();
}

async function dropAsset(id: string) {
  if (!article.value || jobLocked.value) return;
  const order = imageAssets.value.map((a) => a.id).filter((x) => x !== id);
  article.value.layout = {
    ...(article.value.layout || {}),
    long: { coverId: order[0] ?? null },
    note: { order },
  };
  await save();
}

async function moveAsset(index: number, dir: number) {
  if (!article.value || jobLocked.value) return;
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
