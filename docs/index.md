---
layout: home

hero:
  name: "LangChain.js"
  text: "中文手册 + 训练场"
  tagline: 从第一次 invoke() 走到 Agentic RAG。浏览器里写 TypeScript、提交即判题，不需要 API Key。
  image:
    src: /logo.svg
    alt: LangChain.js 手册
  actions:
    - theme: brand
      text: 开始学习
      link: /guide/
    - theme: alt
      text: 进入训练场
      link: /playground/
    - theme: alt
      text: 术语表
      link: /glossary

features:
  - icon: 📘
    title: 9 章精华笔记
    details: 知识点导向，不是课程翻译。每章都有速览、关键代码、常见坑和练习入口。
    link: /guide/
  - icon: 🏋️
    title: 13 题交互训练场
    details: 左侧题目与示例，右侧编辑器，下方测试结果与控制台。进度存在浏览器本地。
    link: /playground/
  - icon: ⚡
    title: 打开就能练
    details: ChatOpenAI 是确定性模拟模型，API 与真实 LangChain.js 对齐，零密钥、可断言。
    link: /playground/?id=ch01-hello-llm
  - icon: 🎯
    title: Agent 优先路径
    details: 先工具、再 Agent，最后把检索封装成工具——对应现代生产级 AI 应用的构建方式。
    link: /guide/08-agentic-rag
---

<HomeShowcase />
