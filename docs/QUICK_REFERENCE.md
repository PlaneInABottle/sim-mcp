# sim-mcp Quick Reference

## 📦 One-Time Setup (for developers)

```bash
# 1. Clone and install
git clone <internal-repo-url> sim-mcp
cd sim-mcp
npm install

# 2. Build
npm run build

# 3. Add to ~/.copilot/mcp-config.json
{
  "mcpServers": {
    "sim-mcp": {
      "command": "npm",
      "args": ["run", "start"],
      "cwd": "/full/path/to/sim-mcp",
      "env": {
        "SIM_API_BASE_URL": "http://localhost:3000",
        "SIM_API_KEY": "${SIM_API_KEY}"
      }
    }
  }
}

# 4. Set API key
export SIM_API_KEY="your-api-key"

# 5. Run Copilot
copilot
```

## 🚀 Daily Development

```bash
# Terminal 1: Watch and auto-rebuild
npm run dev

# Terminal 2: Test with Copilot
copilot
```

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests
SIM_API_BASE_URL=http://localhost:3000 npm run test:integration

# With coverage
npm run test:coverage
```

## 🔧 Common Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run build` | Build TypeScript → dist/ |
| `npm run dev` | Watch mode (auto-rebuild) |
| `npm run start` | Run MCP server directly |
| `npm test` | Run unit tests |
| `npm run lint` | Check code style |
| `npm run format` | Auto-fix formatting |

## 📝 Project Structure

```
src/
├── index.ts              # CLI entry point (--server flag)
├── server.ts             # MCP server configuration
├── client/               # SimApiClient (HTTP wrapper)
│   ├── sim-api-client.ts
│   ├── auth.ts
│   ├── errors.ts
│   └── types.ts
├── tools/                # MCP tool implementations
│   ├── workflow/         # Workflow CRUD
│   ├── block/            # Block operations
│   ├── edge/             # Edge/connection operations
│   ├── variable/         # Variable management
│   ├── execution/        # Workflow execution
│   └── knowledge/        # Knowledge base
├── schemas/              # Zod validation schemas
└── utils/                # Logging, retry logic, validation
```

## 🔐 Configuration

### Environment Variables

Set in your shell or `.env`:
```bash
export SIM_API_BASE_URL="http://localhost:3000"
export SIM_API_KEY="sk_test_abc123"
```

### Copilot CLI Config

Edit `~/.copilot/mcp-config.json`:
```json
{
  "mcpServers": {
    "sim-mcp": {
      "tools": ["*"],
      "type": "local",
      "command": "npm",
      "args": ["run", "start"],
      "cwd": "/full/path/to/sim-mcp",
      "env": {
        "SIM_API_BASE_URL": "http://localhost:3000",
        "SIM_API_KEY": "${SIM_API_KEY}"
      }
    }
  }
}
```

## 🛠️ Troubleshooting

### "sim-mcp tools not showing in Copilot"

1. Check config is in `~/.copilot/mcp-config.json`
2. Verify `cwd` path is absolute and correct
3. Run: `npm run build` to ensure dist/ exists
4. Check API key is set: `echo $SIM_API_KEY`

### "Cannot connect to sim API"

1. Check sim backend is running: `http://localhost:3000`
2. Verify API key: `curl -H "X-API-Key: $SIM_API_KEY" http://localhost:3000/api/workflows`
3. Check `SIM_API_BASE_URL` is correct

### "TypeScript compilation errors"

1. Clear node_modules: `rm -rf node_modules && npm install`
2. Rebuild: `npm run build`
3. Check TypeScript version: `npm ls typescript`

## 📚 Documentation

- [Implementation Plan](./sim-mcp-server.plan.md) - Detailed 39-commit breakdown
- [Tools Reference](./tools.md) - All tools, inputs, outputs
- [Setup Guide](./setup.md) - Step-by-step setup
- [API Reference](./api-reference.md) - API endpoint mappings

## 🔄 Development Workflow

1. **Make changes** in `src/` files
2. **npm run dev** watches and auto-rebuilds
3. **Open new terminal** and run `copilot`
4. **Test your changes** with Claude
5. **Check tests** with `npm test`
6. **Commit** when done: `git add . && git commit -m "..."`

## 📤 Releasing

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create tag: `git tag v1.0.0`
4. Push: `git push origin v1.0.0`
5. Team pulls latest: `git pull && npm run build`

## 💡 Tips

- Use watch mode while developing for instant feedback
- Run tests before committing
- Keep tools focused and single-purpose
- Document tool inputs/outputs in schemas
- Use error types for consistent error handling

---

**For detailed information, see [Implementation Plan](./sim-mcp-server.plan.md)**
