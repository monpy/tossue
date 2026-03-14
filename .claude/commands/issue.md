# Issue Handler Command

Handle GitHub issue and implement the solution.

**IMPORTANT: Always respond in Japanese (日本語で回答してください)**

## Arguments

- $ARGUMENTS: GitHub issue number (e.g., "123" or "#123")

## Workflow

### 1. Load Issue

```bash
gh issue view <issue_number> --json title,body,labels,comments
```

Read and understand the issue content thoroughly.

### 2. Check Existing Specs

Search for relevant specifications in the `docs/` directory:

- Look for related documentation
- Check if there's an existing spec that covers this issue
- Identify if the issue is about:
  - A bug (違反している仕様があるか)
  - A new feature (仕様が存在するか)
  - An enhancement (既存仕様の変更が必要か)

### 3. Spec Verification

**If no relevant spec exists or spec needs update:**

1. Ask user to confirm before creating/updating spec
2. Create or update documentation in `docs/`
3. Include the spec change in the PR

**If spec exists and issue is a bug:**

1. Proceed to planning phase

### 4. Planning Phase

Enter plan mode and create a detailed implementation plan:

1. Analyze the codebase to understand current implementation
2. Identify files that need to be modified
3. Design the solution approach
4. Consider edge cases and potential impacts
5. Write plan to `.plans/<issue_number>.md` for user approval

### 5. Create Working Branch

```bash
git checkout devel
git pull origin devel
git checkout -b issue-<issue_number>
```

### 6. Implementation

After plan approval:

1. Implement the solution following the plan
2. Make atomic commits with clear messages
3. Reference issue number in commits (e.g., "fix: resolve #123")

### 7. Create Pull Request

```bash
git push -u origin issue-<issue_number>
gh pr create --base devel --title "<type>: <description> (#<issue_number>)" --body "..."
```

Include in PR body:
- Summary of changes
- Reference to issue: `Closes #<issue_number>`
- Test plan

## Notes

- Always check `docs/` for existing specifications before implementing
- Ask for user confirmation when specs need to be created or modified
- Follow the branch naming convention: `issue-<number>`
- Follow commit message format defined in `docs/contributing.md`
