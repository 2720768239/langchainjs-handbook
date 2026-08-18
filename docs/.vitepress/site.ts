/**
 * 站点元信息：GitHub Pages 的 base、仓库链接、OG 都从这里读。
 *
 * 本地开发时如需显示 GitHub 图标，可设环境变量 GITHUB_OWNER=你的用户名。
 * CI 会自动读取 GITHUB_REPOSITORY。
 */
export const REPO_NAME = "langchainjs-handbook";

const fromCi = process.env.GITHUB_REPOSITORY?.split("/")[0];
export const GITHUB_OWNER = fromCi || process.env.GITHUB_OWNER || "";

export const usePagesBase =
  process.env.GITHUB_ACTIONS === "true" || Boolean(process.env.VP_BASE);

export const base = usePagesBase ? `/${REPO_NAME}/` : "/";

export const githubRepo = GITHUB_OWNER
  ? `https://github.com/${GITHUB_OWNER}/${REPO_NAME}`
  : "";

export const pagesUrl = GITHUB_OWNER
  ? `https://${GITHUB_OWNER}.github.io/${REPO_NAME}/`
  : "";

export const siteName = "LangChain.js 手册";
export const siteDescription =
  "从第一次 LLM 调用到 Agentic RAG：中文手册 + 浏览器内交互训练场，无需 API Key。";
