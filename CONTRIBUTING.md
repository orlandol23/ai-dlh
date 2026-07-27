# Contributing to AI-DLH

Thank you for considering contributing to AI-DLH! 🎉

## 🤝 How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/orlandol23/ai-dlh/issues)
2. If not, create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Environment (OS, Browser, Node version)

### Suggesting Features

1. Create an issue with the `enhancement` label
2. Describe the feature and its use case
3. Explain why it would be useful for other users

### Pull Requests

1. **Fork** the repository

2. **Clone** your fork:

   ```bash
   git clone https://github.com/orlandol23/ai-dlh.git
   ```

3. **Create a branch** for your feature:

   ```bash
   git checkout -b feature/MyFeature
   ```

4. **Make your changes** following the project standards

5. **Test** your changes:

   ```bash
   npm run test
   npm run lint
   ```

6. **Commit** with descriptive messages:

   ```bash
   git commit -m "feat: add X functionality"
   ```

7. **Push** to your fork:

   ```bash
   git push origin feature/MyFeature
   ```

8. **Open a Pull Request** to the original repository

## 📝 Code Standards

### TypeScript

- Use TypeScript strict mode
- Avoid `any` whenever possible
- Document complex functions with JSDoc

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `style:` formatting (no code change)
- `refactor:` code refactoring
- `test:` adding/modifying tests
- `chore:` maintenance tasks

### Linting

```bash
# Frontend
cd frontend && npm run lint

# Backend
cd server && npm run lint
```

## 🧪 Testing

Add tests for new features:

```bash
# Smart contracts
npm run test:contract

# Backend
npm run test:backend

# Frontend
npm run test
```

## 📁 Project Structure

```
ai-dlh/
├── contracts/     # Solidity smart contracts
├── frontend/      # React application
├── server/        # Node.js backend
└── docs/          # Documentation
```

## 🔒 Security

- Never commit secrets or API keys
- Use environment variables for sensitive data
- Report security vulnerabilities privately

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🙏
