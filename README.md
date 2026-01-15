# sim-mcp - Model Context Protocol Server for sim

A TypeScript-based MCP server that exposes sim's AI workflow platform capabilities to AI clients like Claude via the Copilot CLI.

## 📋 Overview

This project provides a comprehensive MCP server that allows AI assistants to:
- Create, read, update, delete workflows
- Add, remove, and configure blocks
- Connect blocks with edges
- Manage workflow variables
- Execute workflows and monitor execution
- Manage knowledge bases
- Search and query workflow data

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- A running sim backend instance

### Installation

1. Clone from internal repository
```bash
git clone <internal-repo-url> sim-mcp
cd sim-mcp
npm install
```

2. Build the project
```bash
npm run build
```

3. Configure Copilot CLI
Add to `~/.copilot/mcp-config.json`:
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

4. Set environment variable
```bash
export SIM_API_KEY="your-api-key"
```

5. Run Copilot CLI
```bash
copilot
```

## 📚 Documentation

- **[Implementation Plan](./docs/sim-mcp-server.plan.md)** - Comprehensive 39-commit implementation guide
- **[Tool Reference](./docs/tools.md)** - Complete tool definitions and schemas
- **[Setup Guide](./docs/setup.md)** - Detailed setup instructions
- **[API Reference](./docs/api-reference.md)** - API endpoint mappings

## 🛠️ Development

### Setup
```bash
npm install
npm run build
```

### Development with watch mode
```bash
# Terminal 1: Watch and rebuild
npm run dev

# Terminal 2: Test with Copilot CLI
copilot
```

### Testing
```bash
# Unit tests
npm test

# Integration tests (requires sim backend)
SIM_API_BASE_URL=http://localhost:3000 npm run test:integration
```

### Linting
```bash
npm run lint
```

## 📦 Project Structure

```
sim-mcp/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── server.ts             # MCP server setup
│   ├── client/               # sim API client
│   ├── tools/                # MCP tool handlers
│   ├── schemas/              # Zod validation schemas
│   └── utils/                # Utilities (logging, retry, etc.)
├── tests/
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
├── docs/                     # Documentation
├── package.json
└── tsconfig.json
```

## 🔧 Available Tools

### Tier 1: Essential
- `list_workflows` - List all workflows
- `get_workflow` - Get workflow details (verbose=true for full block config)
- `create_workflow` - Create new workflow
- `update_workflow` - Update workflow metadata
- `delete_workflow` - Delete workflow
- `execute_workflow` - Run a workflow
- `add_block` - Add block to workflow
- `remove_block` - Remove block from workflow
- `add_edge` - Connect two blocks
- `remove_edge` - Disconnect blocks

### Tier 2: Important
- `deploy_workflow` - Deploy workflow for API access
- `undeploy_workflow` - Remove deployment
- `update_block` - Update block properties
- `update_block_position` - Move a block
- `toggle_block` - Enable/disable block
- `list_variables` - List workflow variables
- `set_variable` - Create/update variable
- `delete_variable` - Delete variable
- `get_execution_status` - Check execution status
- `get_execution_history` - View past executions

### Tier 3: Nice-to-Have
- `list_knowledge_bases` - List knowledge bases
- `create_knowledge_base` - Create knowledge base
- `delete_knowledge_base` - Delete knowledge base
- `search_knowledge` - Vector search
- `list_block_types` - Available block types
- `get_block_schema` - Block type schema
- `duplicate_workflow` - Clone workflow
- `import_workflow` - Import from YAML

## 🔐 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SIM_API_BASE_URL` | Yes | Base URL of sim backend API |
| `SIM_API_KEY` | Yes | API key for authentication |
| `SIM_TIMEOUT` | No | Request timeout in ms (default: 30000) |
| `SIM_RETRIES` | No | Retry attempts (default: 3) |

### Local Configuration

Update `~/.copilot/mcp-config.json`:

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

## 🏗️ Architecture

```
User runs: copilot
    ↓
Copilot CLI reads config
    ↓
Launches: npm run start
    ↓
sim-mcp server starts on stdio
    ↓
Claude can use sim tools
    ↓
sim-mcp makes HTTP calls to sim API
```

## 📊 Implementation Status

- **Phase 1**: Core Setup (8 commits)
- **Phase 2**: Workflow CRUD (9 commits)
- **Phase 3**: Block & Edge Operations (8 commits)
- **Phase 4**: Variables, Execution, Deploy (7 commits)
- **Phase 5**: Knowledge Base & Polish (7 commits)

**Total**: 39 commits, ~4,500 lines of TypeScript

See [Implementation Plan](./docs/sim-mcp-server.plan.md) for detailed commit-by-commit breakdown.

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
SIM_API_BASE_URL=http://localhost:3000 npm run test:integration
```

### Test Coverage
```bash
npm run test:coverage
```

## 📝 Version Management

Versions are managed through git tags:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`

Each developer pulls the latest and rebuilds locally.

## 📄 License

Internal use only - Not for public distribution.

## 📞 Support

For questions or issues, contact the sim team.

---

**Last Updated**: 2026-01-08  
**Status**: Implementation Ready
