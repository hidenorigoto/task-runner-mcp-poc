# Claude CodeのTodoWrite機能を代替するMCPサーバー開発ガイド

このガイドでは、Model Context Protocol（MCP）を使用してClaude CodeのTodoWrite機能を代替するサーバー開発について、包括的な技術調査結果をまとめています。

## MCPプロトコルとTodoWrite機能の概要

### MCPの革新的アーキテクチャ

**Model Context Protocol（MCP）**は、[2024年11月にAnthropicが発表](https://www.anthropic.com/news/model-context-protocol)した画期的なオープンスタンダードプロトコルです。[「AI用のUSB-Cポート」](https://modelcontextprotocol.io/introduction)と表現されるこのプロトコルは、M×N問題（MのAIアプリケーションとNのツール間の全組み合わせの統合）をM+N問題に変換し、統合の複雑性を大幅に削減します。

MCPは[JSON-RPC 2.0をベースとした双方向通信プロトコル](https://modelcontextprotocol.io/specification/2025-03-26/basic)で、以下の3つの核心機能を提供します：

1. **Tools（モデル制御）**: LLMが実行できる関数（天気API、データベース操作など）
2. **Resources（アプリケーション制御）**: LLMがアクセスできるデータソース
3. **Prompts（ユーザー制御）**: ツールやリソースを最適に使用するための事前定義テンプレート

### 詳細な技術仕様

MCPの技術仕様については、以下の公式ドキュメントで詳しく解説されています：

- [MCP公式ドキュメント（Anthropic）](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)
- [MCPプロトコル仕様書](https://modelcontextprotocol.io/specification/2025-03-26/basic)
- [トランスポート仕様](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)

### TodoWrite機能の詳細仕様と課題

TodoWriteはClaude Codeの組み込みタスク管理システムで、リアルタイムでの進捗追跡と複数ステップタスクの管理を可能にします。しかし、[GitHubのIssue追跡](https://github.com/anthropics/claude-code/issues/1824)によると、いくつかの**重要な制限**があります：

- **完全置換動作**: 既存のタスクリストを保持せず、常に完全なリストで置き換える
- **共有状態問題**: [メイン会話とTaskエージェント間でのリスト共有の複雑性](https://github.com/anthropics/claude-code/issues/1173)
- **透明性の欠如**: Taskツール実行中のTodo更新がユーザーに表示されない

これらの課題を解決するため、より柔軟で拡張可能なMCPサーバーの開発が求められています。

## Claude 4 Sonnetとの統合技術仕様

### Tool使用の高度な仕様

[Claude 4 Sonnet](https://www.anthropic.com/news/claude-4)は、**65%少ない不適切なショートカット使用**という高精度なtool選択能力を持ち、以下の先進的機能をサポートします：

```json
{
  "model": "claude-sonnet-4-20250514",
  "tools": [{
    "name": "task_management",
    "description": "Manage tasks with full CRUD operations. Use this tool when users want to create, update, or track tasks and todos.",
    "input_schema": {
      "type": "object",
      "properties": {
        "operation": {
          "type": "string",
          "enum": ["create", "update", "list", "delete"]
        },
        "task_data": {
          "type": "object"
        }
      }
    }
  }]
}
```

詳細なAPI仕様については、[Anthropic API リリースノート](https://docs.anthropic.com/en/release-notes/api)を参照してください。

特筆すべき新機能として、**拡張思考モード（Extended Thinking）**と**並列tool実行**が可能で、複数の独立したタスクを同時に処理できます。

### MCPプロトコル統合の実装詳細

接続初期化プロセスは以下のような構造で実装されます：

```typescript
// 初期化リクエスト
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "resources": {}
    }
  }
}
```

## GitHubにおける実装例とベストプラクティス

### 注目すべきMCPサーバー実装

調査の結果、[**7,260以上のアクティブなMCPサーバー**](https://github.com/TensorBlock/awesome-mcp-servers)が存在し（2025年5月現在）、特に以下の実装が参考になります：

#### Todoist MCP Server

[**Todoist MCP Server**](https://github.com/abhiz123/todoist-mcp-server)は、自然言語でのタスク管理と柔軟なフィルタリング機能を提供し、以下のような直感的な使用が可能です：

- "Create task 'Team Meeting' due tomorrow at 2pm"
- "Show all high priority tasks"
- "Update documentation task to be due next week"

#### GitHub公式MCPサーバー

[**GitHub公式MCPサーバー**](https://github.com/github/github-mcp-server)（Go実装）は、100%の機能性を持つ包括的なGitHub API統合を実現し、Issues管理、Pull Request操作、リポジトリ管理を統合的に扱えます。[2025年4月にパブリックプレビューがリリース](https://github.blog/changelog/2025-04-04-github-mcp-server-public-preview/)されました。

#### その他の参考実装

- [**公式MCP Servers**](https://github.com/modelcontextprotocol/servers): AnthropicによるFilesystemサーバーなどの参考実装
- [**Filesystem MCP Server**](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem): ファイルシステム操作の基本実装
- [**TaskMaster Todoist MCP**](https://www.mcp.bar/server/mingolladaniele/taskMaster-todoist-mcp): タスク管理特化の実装例

### 効果的な設計パターン

成功しているMCPサーバー実装から学べる重要なパターンには、以下があります：

- **段階的権限管理**: セキュリティを重視したアクセス制御
- **自然言語処理による柔軟な検索**: ユーザビリティの向上
- **ステート管理によるセッション間の状態保持**: データの一貫性確保

[**MCP開発ガイド**](https://github.com/cyanheads/model-context-protocol-resources/blob/main/guides/mcp-client-development-guide.md)には、より詳細な設計パターンが記載されています。

## TodoWrite代替に必要な技術設計

### 必須toolsの包括的設計

TodoWrite機能を完全に代替するには、以下の5つのカテゴリーのtoolsが必要です：

1. **ファイル操作系**: createFile、updateFile、deleteFile
2. **ディレクトリ操作系**: listDirectory、createDirectory  
3. **タスク管理系**: createTodo、updateTodo、listTodos、deleteTodo
4. **プロジェクト構造分析**: analyzeProject、findTodos
5. **コード解析**: extractTodos、updateCodeComments

各toolは厳密な型定義とエラーハンドリングを実装する必要があります：

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  dueDate?: Date;
  filePath?: string;
  lineNumber?: number;
}
```

### セキュリティとパフォーマンスの考慮事項

**セキュリティ対策**として、パストラバーサル攻撃防止、許可されたディレクトリへのアクセス制限、適切な認証メカニズムの実装が不可欠です。

**パフォーマンス最適化**では、非同期処理の活用、適切なキャッシング戦略、並行処理制限（ConcurrencyLimiter）の実装により、1秒以内のレスポンスタイムと99%以上の稼働率を実現します。

## 実装推奨事項と技術スタック

### 推奨される技術スタック

- **言語**: TypeScript（型安全性と開発効率の観点から推奨）
- **フレームワーク**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)（公式SDK）
- **代替フレームワーク**: [FastMCP](https://github.com/punkpeye/fastmcp)（軽量な TypeScript フレームワーク）
- **スキーマ検証**: Zod（実行時型検証）
- **ファイル操作**: fast-glob、ignore（効率的なファイル検索）

### 開発リソース

- [**公式TypeScript SDK**](https://github.com/modelcontextprotocol/typescript-sdk): Anthropic公式のSDK
- [**MCPサーバー例**](https://modelcontextprotocol.io/examples): 様々な実装例
- [**クイックスタートガイド**](https://modelcontextprotocol.io/quickstart/user): Claude Desktop ユーザー向け
- [**リモートMCPサーバーのベストプラクティス**](https://support.anthropic.com/en/articles/11596040-best-practices-for-building-remote-mcp-servers)

### 開発環境とデプロイメント

Claude Desktopとの統合は、`claude_desktop_config.json`での設定により実現します：

```json
{
  "mcpServers": {
    "todo-mcp-server": {
      "command": "node",
      "args": ["/path/to/todo-mcp-server/dist/index.js"],
      "env": {
        "ALLOWED_DIRECTORIES": "/home/user/projects",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## 今後の展望と推奨アプローチ

MCPエコシステムは急速に成長しており、[OpenAIやGoogle DeepMindによる正式採用](https://www.infoq.com/news/2024/12/anthropic-model-context-protocol/)も進んでいます。[Microsoft C# SDK](https://devblogs.microsoft.com/blog/microsoft-partners-with-anthropic-to-create-official-c-sdk-for-model-context-protocol)や[DeepLearning.AIのコース](https://www.deeplearning.ai/short-courses/mcp-build-rich-context-ai-apps-with-anthropic/)も提供されており、エコシステムの拡大が続いています。

TodoWrite機能の代替MCPサーバー開発においては、以下のアプローチを推奨します：

1. **段階的実装**: まず基本的なファイル操作とタスク管理から開始
2. **テスト駆動開発**: MCP Inspectorを活用した継続的なテスト
3. **コミュニティ活用**: 既存の実装例を参考にしつつ、独自の価値を追加
4. **セキュリティファースト**: すべての操作に適切な検証とアクセス制御を実装

### 学習リソース

- [**MCP公式イントロダクション**](https://modelcontextprotocol.io/introduction)
- [**Anthropic MCP ドキュメント**](https://docs.anthropic.com/en/docs/mcp)
- [**MCP完全ガイド**](https://simplescraper.io/blog/how-to-mcp)
- [**MCP概要（Phil Schmid's Blog）**](https://www.philschmid.de/mcp-introduction)

## 結論

本調査により、TodoWrite機能を完全に代替し、さらに拡張可能なMCPサーバーの開発が技術的に実現可能であることが明らかになりました。提供された設計指針と実装例を活用することで、プロダクションレディなソリューションの構築が可能です。

---

*この資料は2025年6月時点の情報に基づいて作成されています。最新の情報については各リンク先の公式ドキュメントを参照してください。*