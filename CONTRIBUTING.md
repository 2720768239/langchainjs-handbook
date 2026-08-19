# 贡献指南

感谢你愿意改进这份手册。优先接受这些改动：

- 纠正过时的 LangChain.js v1 API
- 补常见坑、更好的代码示例
- 训练场练习的测试更稳、提示更清楚
- 错别字、死链、图片 alt

## 本地开发

```bash
npm ci
npm run dev
```

打开 http://localhost:5173/

```bash
npm run check            # 类型、Lint、格式、链接、代码片段和全部测试
npm run ci               # 完整检查 + 生产构建 + 产物体积预算
```

排查单项问题时可运行 `npm run lint`、`npm run check:links`、`npm run check:snippets`、`npm run test:samples`、`npm run test:exercises` 或 `npm run test:demos`。提交前可用 `npm run format` 统一 TypeScript、Vue、CSS、JSON 与 YAML 格式。

## 目录约定

| 路径 | 用途 |
|------|------|
| `docs/guide/` | 章节笔记 |
| `docs/.vitepress/theme/playground/exercises/` | 训练场题目 |
| `docs/public/images/` | WebP 章节示意图（路径与笔记中 `/images/...` 对应） |
| `examples/` | 使用真实 LangChain.js / MCP SDK 的可运行示例 |

新增练习时，同步改章节末尾的「动手练习」链接和学习路线图表格。修改真实示例或依赖时，也要更新[版本兼容与运行边界](docs/compatibility.md)。

新增 PNG/JPEG 后运行 `npm run optimize:images` 转换并更新引用。构建产物必须保持在 8 MB 内，单个图片不超过 100 KB；预算由 `npm run check:bundle` 验证。

## GitHub Pages

仓库 Settings → Pages → Source 选 **GitHub Actions**。推送到 `main` 后，workflow 会跑测试并发布到：

https://2720768239.github.io/langchainjs-handbook/

如果仓库名不是 `langchainjs-handbook`，同时改 `docs/.vitepress/site.ts` 里的 `REPO_NAME` 和 `.github/workflows/deploy.yml` 的 `VP_BASE`。
