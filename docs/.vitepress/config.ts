import { defineConfig } from "vitepress";
import fs from "node:fs";
import path from "node:path";
import {
  base,
  githubRepo,
  pagesUrl,
  siteDescription,
  siteName,
} from "./site";

const ogImage = pagesUrl ? `${pagesUrl.replace(/\/$/, "")}/og.png` : undefined;

export default defineConfig({
  lang: "zh-CN",
  title: siteName,
  description: siteDescription,
  base,
  lastUpdated: true,
  cleanUrls: true,

  sitemap: pagesUrl ? { hostname: pagesUrl } : undefined,

  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` }],
    ["link", { rel: "alternate icon", href: `${base}logo.svg` }],
    ["link", { rel: "apple-touch-icon", href: `${base}logo.svg` }],
    ["meta", { name: "theme-color", content: "#1c7ed6" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: siteName }],
    ["meta", { property: "og:description", content: siteDescription }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ["meta", { name: "twitter:title", content: siteName }],
    ["meta", { name: "twitter:description", content: siteDescription }],
    ...(ogImage
      ? ([
          ["meta", { property: "og:url", content: pagesUrl }],
          ["meta", { property: "og:image", content: ogImage }],
          ["meta", { name: "twitter:image", content: ogImage }],
        ] as const)
      : []),
  ],

  vite: {
    worker: { format: "es" },
    optimizeDeps: {
      include: ["sucrase", "markdown-it"],
    },
  },

  async buildEnd(siteConfig) {
    const dest = path.join(siteConfig.outDir, "404.html");
    fs.writeFileSync(
      dest,
      `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting…</title>
    <script>
      (function () {
        var path = location.pathname;
        if (path.endsWith(".html") || path.endsWith("/")) return;
        location.replace(path + ".html" + location.search + location.hash);
      })();
    </script>
  </head>
  <body></body>
</html>
`,
    );
  },

  themeConfig: {
    logo: "/logo.svg",

    nav: [
      { text: "笔记", link: "/guide/", activeMatch: "/guide/" },
      { text: "训练场", link: "/playground/", activeMatch: "/playground/" },
      { text: "术语表", link: "/glossary", activeMatch: "/glossary" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "开始",
          items: [
            { text: "学习路线图", link: "/guide/" },
            { text: "00. 环境搭建", link: "/guide/00-setup" },
          ],
        },
        {
          text: "基础篇",
          items: [
            { text: "01. 初识 LangChain.js", link: "/guide/01-introduction" },
            { text: "02. Chat 模型与基本交互", link: "/guide/02-chat-models" },
            {
              text: "03. 提示词、消息与结构化输出",
              link: "/guide/03-prompts",
            },
          ],
        },
        {
          text: "进阶篇",
          items: [
            { text: "04. 函数调用与工具", link: "/guide/04-tools" },
            { text: "05. Agent 入门", link: "/guide/05-agents" },
            { text: "06. 模型上下文协议 MCP", link: "/guide/06-mcp" },
          ],
        },
        {
          text: "实战篇",
          items: [
            {
              text: "07. 文档、Embedding 与语义搜索",
              link: "/guide/07-embeddings",
            },
            { text: "08. 构建 Agentic RAG 系统", link: "/guide/08-agentic-rag" },
          ],
        },
      ],
    },

    outline: { label: "本页目录", level: [2, 3] },

    socialLinks: githubRepo ? [{ icon: "github", link: githubRepo }] : [],

    editLink: githubRepo
      ? {
          pattern: `${githubRepo}/edit/main/docs/:path`,
          text: "在 GitHub 上编辑此页",
        }
      : undefined,

    footer: {
      message:
        '笔记内容基于 <a href="https://github.com/microsoft/langchainjs-for-beginners" target="_blank">microsoft/langchainjs-for-beginners</a>（MIT License）整理提炼',
      copyright: "MIT Licensed",
    },

    docFooter: { prev: "上一章", next: "下一章" },
    lastUpdatedText: "最后更新",
    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "外观",
    search: {
      provider: "local",
      options: {
        translations: {
          button: { buttonText: "搜索", buttonAriaLabel: "搜索" },
          modal: {
            noResultsText: "没有找到结果",
            resetButtonTitle: "清除",
            footer: { selectText: "选择", navigateText: "切换", closeText: "关闭" },
          },
        },
      },
    },
  },
});
