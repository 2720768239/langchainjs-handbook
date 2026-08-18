# 贡献指南

感谢你愿意改进这份手册。优先接受这些改动：

- 纠正过时的 LangChain.js v1 API
- 补常见坑、更好的代码示例
- 训练场练习的测试更稳、提示更清楚
- 错别字、死链、图片 alt

## 本地开发

```bash
npm install
npm run dev
```

打开 http://localhost:5173/

```bash
npm run test:exercises   # 13 道练习的参考答案必须全过
npm run build
```

## 目录约定

| 路径 | 用途 |
|------|------|
| `docs/guide/` | 章节笔记 |
| `docs/.vitepress/theme/playground/exercises/` | 训练场题目 |
| `docs/.vitepress/site.ts` | 仓库名 / Pages base |

新增练习时，同步改章节末尾的「动手练习」链接和学习路线图表格。

## GitHub Pages

仓库 Settings → Pages → Source 选 **GitHub Actions**。推送到 `main` 后，workflow 会跑测试并发布到：

https://2720768239.github.io/langchainjs-handbook/

如果仓库名不是 `langchainjs-handbook`，同时改 `docs/.vitepress/site.ts` 里的 `REPO_NAME` 和 `.github/workflows/deploy.yml` 的 `VP_BASE`。
