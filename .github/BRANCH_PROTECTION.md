# Branch Protection Rules for astro-planet-viewer

这个文档说明了如何在 GitHub 上配置分支保护规则。

## 自动配置（推荐）

已创建 GitHub Actions 工作流，会自动对 Pull Request 进行代码审查。

## 手动配置步骤

### 1. 进入仓库设置

访问：https://github.com/birdmanhj/astro-planet-viewer/settings/branches

### 2. 添加分支保护规则

点击 **Add rule** 或 **Add branch protection rule**

### 3. 配置规则

#### Branch name pattern
```
master
```

#### 保护设置

勾选以下选项：

- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `1` (至少需要 1 人审查)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (可选)

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - 添加必需的状态检查：
    - `build` (来自 deploy.yml)
    - `Copilot Code Review` (来自 copilot-review.yml)

- ✅ **Require conversation resolution before merging**
  - 确保所有评论都已解决

- ✅ **Require signed commits** (可选，增强安全性)

- ✅ **Require linear history** (可选，保持提交历史整洁)

- ✅ **Include administrators**
  - 规则也适用于管理员

#### 不建议勾选的选项

- ❌ **Allow force pushes** - 可能导致历史丢失
- ❌ **Allow deletions** - 防止意外删除分支

### 4. 保存规则

点击 **Create** 或 **Save changes**

## 配置文件说明

### `.github/copilot-review.yml`
Copilot 代码审查规则配置，包括：
- 安全检查
- 代码质量检查
- React 最佳实践
- Three.js 特定规则
- 项目特定规则

### `.github/workflows/copilot-review.yml`
GitHub Actions 工作流，自动执行：
- ESLint 代码检查
- 代码质量分析
- 安全审计
- 自动在 PR 中发布审查报告

## 使用方式

1. 创建新分支进行开发
2. 提交代码到分支
3. 创建 Pull Request 到 master
4. GitHub Actions 自动运行代码审查
5. 审查通过后合并到 master
6. 自动触发部署到 GitHub Pages

## 示例工作流

```bash
# 1. 创建新分支
git checkout -b feature/new-feature

# 2. 进行开发
# ... 编写代码 ...

# 3. 提交更改
git add .
git commit -m "Add new feature"

# 4. 推送到远程
git push origin feature/new-feature

# 5. 在 GitHub 上创建 Pull Request
# 6. 等待自动审查完成
# 7. 根据审查建议修改代码（如有需要）
# 8. 获得审查批准后合并
```

## 注意事项

- 首次配置后，需要至少一次 PR 来测试工作流
- 如果 Actions 失败，检查 Actions 标签页的日志
- 可以在 `.github/copilot-review.yml` 中调整规则严格程度
- 安全审计会检查 npm 依赖的已知漏洞
