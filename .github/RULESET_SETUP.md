# GitHub Rulesets 配置指南

## 问题：This ruleset does not target any resources and will not be applied.

这个错误表示 Ruleset 没有指定目标分支或标签。

## 解决方案：在 GitHub 网页界面配置

### 步骤 1：访问 Rulesets 设置

访问：https://github.com/birdmanhj/astro-planet-viewer/settings/rules

### 步骤 2：创建新的 Ruleset

1. 点击 **New ruleset** → **New branch ruleset**

### 步骤 3：配置 Ruleset 基本信息

#### Ruleset Name
```
Protect master branch
```

#### Enforcement status
- 选择 **Active** (立即生效)

### 步骤 4：配置目标分支（重要！）

在 **Target branches** 部分：

1. 点击 **Add target**
2. 选择 **Include by pattern**
3. 输入分支名称：
   ```
   master
   ```
   或使用通配符保护多个分支：
   ```
   main
   master
   release/*
   ```

**这一步是必须的！** 如果不配置目标分支，就会出现 "does not target any resources" 错误。

### 步骤 5：配置保护规则

勾选以下规则：

#### ✅ Require a pull request before merging
- **Required approvals**: `1`
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require approval of the most recent reviewable push

#### ✅ Require status checks to pass
- ✅ Require branches to be up to date before merging
- 点击 **Add checks**，添加：
  - `build` (来自 deploy.yml)
  - `Copilot Code Review` (来自 copilot-review.yml)

#### ✅ Block force pushes
- 防止强制推送覆盖历史

#### ✅ Require linear history (可选)
- 保持提交历史整洁

#### ✅ Require deployments to succeed (可选)
- 确保部署成功后才能合并

### 步骤 6：配置绕过规则（可选）

在 **Bypass list** 部分，可以设置哪些人可以绕过规则：
- Repository administrators
- Specific users or teams

**建议**：不要添加绕过规则，确保所有人都遵守相同的流程。

### 步骤 7：保存 Ruleset

点击 **Create** 按钮保存配置。

## 验证配置

配置完成后，你应该看到：
- Ruleset 状态显示为 **Active**
- Target branches 显示 `master` 或你配置的分支
- 规则列表显示你勾选的所有保护规则

## 测试 Ruleset

1. 创建新分支：
   ```bash
   git checkout -b test/ruleset-check
   ```

2. 做一些修改并提交：
   ```bash
   echo "test" >> README.md
   git add README.md
   git commit -m "Test ruleset"
   git push origin test/ruleset-check
   ```

3. 在 GitHub 上创建 Pull Request 到 master

4. 你应该看到：
   - ✅ 需要至少 1 人审查
   - ✅ 需要通过状态检查（Copilot Code Review, build）
   - ❌ 无法直接推送到 master 分支

## 常见问题

### Q: 为什么我看不到 "New ruleset" 按钮？
A: 确保你有仓库的管理员权限。

### Q: 状态检查没有出现在列表中？
A: 状态检查需要至少运行一次才会出现在列表中。先创建一个 PR，等待 Actions 运行完成后，再回来添加状态检查。

### Q: 我想临时绕过规则怎么办？
A: 可以暂时将 Ruleset 状态改为 **Disabled**，完成操作后再改回 **Active**。

### Q: Ruleset 和 Branch protection rules 有什么区别？
A: Rulesets 是新版本的分支保护功能，功能更强大，可以同时保护多个分支。如果你的仓库还在使用旧版 Branch protection rules，建议迁移到 Rulesets。

## 推荐配置（最小化）

如果你只想要基本保护，最少需要配置：

1. **Target branches**: `master`
2. **Require a pull request before merging**: 开启
3. **Required approvals**: `1`

这样就可以防止直接推送到 master，必须通过 PR 流程。

## 推荐配置（完整）

完整的保护配置应该包括：

1. **Target branches**: `master`
2. **Require a pull request before merging**: 开启，需要 1 人审查
3. **Require status checks to pass**: 开启，添加 CI/CD 检查
4. **Block force pushes**: 开启
5. **Require linear history**: 开启（可选）

这样可以确保代码质量和历史记录的完整性。
