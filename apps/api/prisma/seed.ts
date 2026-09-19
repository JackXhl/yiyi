import "../src/load-env.js";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PERMISSIONS } from "@yiyi/shared";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const prisma = new PrismaClient();

async function main() {
  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
  }
  const superRole = await prisma.role.upsert({
    where: { name: "超级管理员" },
    update: {},
    create: { name: "超级管理员" },
  });
  const perms = await prisma.permission.findMany();
  for (const p of perms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: superRole.id, permissionId: p.id },
    });
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@yiyi.local").toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || "yiyi-admin-change-me";
  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: await bcrypt.hash(adminPass, 10) },
  });
  await prisma.adminRole.upsert({
    where: { adminId_roleId: { adminId: admin.id, roleId: superRole.id } },
    update: {},
    create: { adminId: admin.id, roleId: superRole.id },
  });

  await prisma.plan.upsert({
    where: { code: "trial" },
    update: {},
    create: { code: "trial", name: "体验", monthlyQuota: 3, durationDays: 14, priceFen: 0 },
  });
  await prisma.plan.upsert({
    where: { code: "month" },
    update: {},
    create: { code: "month", name: "月付", monthlyQuota: 40, durationDays: 31, priceFen: 4900 },
  });
  await prisma.plan.upsert({
    where: { code: "year" },
    update: {},
    create: { code: "year", name: "年付", monthlyQuota: 40, durationDays: 366, priceFen: 39900 },
  });

  const form = [
    ["form.long", "公众号长文", 1, false],
    ["form.note", "小红书图文", 2, false],
    ["form.both", "长文与笔记", 3, false],
  ] as const;
  for (const [code, labelZh, sort] of form) {
    await upsertOpt(code, labelZh, "form", sort, false, "");
  }
  const intent = [
    ["intent.story", "经历叙述", 1, ""],
    ["intent.howto", "方法教程", 2, ""],
    ["intent.opinion", "观点评论", 3, ""],
    ["intent.promo", "商品推荐", 4, "advertising"],
  ] as const;
  for (const [code, labelZh, sort, risk] of intent) {
    await upsertOpt(code, labelZh, "intent_genre", sort, false, risk);
  }

  const l1 = [
    "吃的",
    "出门玩",
    "带孩子",
    "上班",
    "买东西",
    "化妆穿搭",
    "手机电脑",
    "在本地",
    "健身运动",
    "家里装修",
    "学习考试",
    "养宠物",
    "车",
    "房子",
    "读书影视",
    "游戏动漫",
    "追星娱乐",
    "公司生意",
    "兴趣爱好",
    "过节办事",
    "科学",
    "其他",
  ];
  const codes = [
    "food",
    "outing",
    "kids",
    "work",
    "shopping",
    "fashion",
    "tech",
    "local",
    "fitness",
    "home",
    "study",
    "pets",
    "car",
    "house",
    "media",
    "game",
    "star",
    "biz",
    "hobby",
    "festival",
    "science",
    "other",
  ];
  for (let i = 0; i < l1.length; i++) {
    await upsertOpt(`topic.${codes[i]}`, l1[i], "topic", i + 1, true, "");
  }
  const more = [
    ["topic.health", "看病健康", "medical"],
    ["topic.finance", "理财", "finance"],
    ["topic.politics", "时政", "politics"],
    ["topic.law", "法律", "law"],
    ["topic.faith", "信仰", "scd"],
    ["topic.env", "环境", ""],
    ["topic.weather", "天气", ""],
  ] as const;
  for (let i = 0; i < more.length; i++) {
    const [code, labelZh, risk] = more[i];
    await upsertOpt(code, labelZh, "topic", 100 + i, false, risk);
  }

  await Promise.all([
    prisma.capabilitySlot.upsert({ where: { slot: "text_json" }, update: {}, create: { slot: "text_json" } }),
    prisma.capabilitySlot.upsert({ where: { slot: "text_long" }, update: {}, create: { slot: "text_long" } }),
    prisma.capabilitySlot.upsert({ where: { slot: "vision" }, update: {}, create: { slot: "vision" } }),
  ]);

  await prisma.stylePreset.upsert({
    where: { code: "system" },
    update: { params: { cut: true, hint: "短句。先写看见的，再写做了什么。不写金句，不编对话和数字。" } },
    create: {
      code: "system",
      labelZh: "系统默认",
      rights: "system",
      params: { cut: true, hint: "短句。先写看见的，再写做了什么。不写金句，不编对话和数字。" },
    },
  });

  await prisma.siteConfig.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", json: { name: "一意" } },
  });

  const existingPrompt = await prisma.promptTemplate.findFirst({ where: { node: "outline" } });
  if (!existingPrompt) {
    await prisma.promptTemplate.createMany({
      data: [
        { node: "outline", body: "用用户锚点排背景-发生-结果-边界，不写金句。" },
        { node: "body", body: "只写已确认事实。禁止编造对话和数字。不要输出 HTML。分段写，一段一事，每条事实至少一段。" },
      ],
    });
  }

  const iabPath = resolve(process.cwd(), "../../docs/taxonomy/sources/iab-3.1.tsv");
  try {
    const lines = readFileSync(iabPath, "utf8").split(/\r?\n/).filter(Boolean);
    console.log(`IAB vendor rows (incl header): ${lines.length}`);
  } catch {
    console.log("IAB tsv not found at seed time");
  }

  console.log(`seed ok admin=${adminEmail}`);
}

async function upsertOpt(
  code: string,
  labelZh: string,
  axis: string,
  sort: number,
  cendL1: boolean,
  risk: string,
) {
  await prisma.topicOption.upsert({
    where: { code },
    update: { labelZh, sort, cendL1, risk },
    create: { code, labelZh, axis, sort, cendL1, risk },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
