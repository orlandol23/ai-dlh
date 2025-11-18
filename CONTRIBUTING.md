# Contribuindo para AI-DLH

Obrigado por considerar contribuir para o AI-DLH! 🎉

## 🤝 Como Contribuir

### Reportar Bugs

1. Verifique se o bug já foi reportado nas [Issues](https://github.com/seu-usuario/ai-dlh/issues)
2. Se não, crie uma nova issue com:
   - Descrição clara do problema
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Screenshots (se aplicável)
   - Ambiente (OS, Browser, Node version)

### Sugerir Features

1. Crie uma issue com a tag `enhancement`
2. Descreva a feature e seu caso de uso
3. Explique por que seria útil para outros usuários

### Pull Requests

1. **Fork** o repositório
2. **Clone** seu fork:
   ```bash
   git clone https://github.com/seu-usuario/ai-dlh.git
   ```

3. **Crie uma branch** para sua feature:
   ```bash
   git checkout -b feature/MinhaFeature
   ```

4. **Faça suas alterações** seguindo os padrões do projeto

5. **Teste** suas alterações:
   ```bash
   npm run test
   npm run lint
   ```

6. **Commit** com mensagens descritivas:
   ```bash
   git commit -m "feat: adiciona funcionalidade X"
   ```

7. **Push** para seu fork:
   ```bash
   git push origin feature/MinhaFeature
   ```

8. **Abra um Pull Request** no repositório original

## 📝 Padrões de Código

### TypeScript

- Use TypeScript strict mode
- Evite `any` sempre que possível
- Documente funções complexas com JSDoc

### Commits

Siga o padrão [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` mudanças na documentação
- `style:` formatação (sem mudança de código)
- `refactor:` refatoração
- `test:` adição/modificação de testes
- `chore:` tarefas de manutenção

### Linting

```bash
# Frontend
cd frontend && npm run lint

# Backend
cd server && npm run lint
```

## 🧪 Testes

Adicione testes para novas funcionalidades:

```bash
# Smart contracts
npm run test:contract

# Backend
npm run test:backend

# Frontend
npm run test
```

## 📚 Documentação

Atualize a documentação quando necessário:

- README.md
- Comentários no código
- JSDoc/TSDoc

## ❓ Dúvidas?

- Abra uma issue com a tag `question`
- Entre em contato: seu-email@example.com

Obrigado por contribuir! 🚀
