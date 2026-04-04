---
name: architecture-documentation
description: "Living architecture documentation with decision tracking and automated diagram generation. Use for maintaining design decisions, system maps, and evolving technical documentation as code."
argument-hint: "Optional: specify components, decisions, or diagram types to focus documentation on"
---

# Architecture Documentation

## When to Use

- Setting up new projects requiring architecture documentation
- Making significant technical decisions that need recording
- Onboarding new team members to system architecture
- Planning system changes or technology migrations
- Conducting architecture reviews and technical audits
- Generating up-to-date system diagrams and documentation

## Architecture Documentation Checklist

### Decision Documentation

**Architecture Decision Records (ADRs)**

- [ ] ADR template established and consistently used
- [ ] Decision context, options, and rationale documented
- [ ] Consequences and trade-offs explicitly stated
- [ ] Decision status tracked (proposed, accepted, deprecated, superseded)
- [ ] Historical decisions accessible and searchable
- [ ] Review process established for significant decisions

**Technology Stack Documentation**

- [ ] Current technology choices documented with rationale
- [ ] Dependencies and version constraints explained
- [ ] Alternative solutions considered and rejected documented
- [ ] Migration paths and upgrade strategies planned
- [ ] Performance, security, and scalability implications noted
- [ ] Team expertise and learning curve considerations recorded

### System Architecture Diagrams

**Automated Diagram Generation**

- [ ] Diagrams generated from code and configuration
- [ ] CI/CD pipeline updates diagrams on changes
- [ ] Multiple view types maintained (C4, component, deployment)
- [ ] Diagram versioning aligned with code releases
- [ ] Stakeholder-specific views generated automatically
- [ ] Diagram validation and consistency checks automated

**Architecture Views**

- [ ] System context diagram (external dependencies)
- [ ] Container diagram (high-level runtime view)
- [ ] Component diagram (internal structure)
- [ ] Code diagram (class/module relationships)
- [ ] Deployment diagram (infrastructure and environments)
- [ ] Data flow diagrams (information movement)

### Living Documentation

**Documentation as Code**

- [ ] Architecture docs version controlled with source code
- [ ] Documentation updates required for architectural changes
- [ ] Automated documentation generation from code annotations
- [ ] Cross-references between code and documentation maintained
- [ ] Documentation review process integrated with code reviews
- [ ] Stale documentation detection and cleanup automated

**Evolution Tracking**

- [ ] Architecture timeline and major milestones documented
- [ ] Technology adoption and retirement tracked
- [ ] Performance and scalability evolution recorded
- [ ] Team structure and ownership changes documented
- [ ] Architectural debt and improvement opportunities identified
- [ ] Decision outcomes and learning summarized

## Architecture Documentation Implementation

### ADR Template and Process

```markdown
# ADR-001: [Short descriptive title]

**Status**: [Proposed | Accepted | Deprecated | Superseded by ADR-XXX]
**Date**: YYYY-MM-DD
**Deciders**: [List people involved in decision]

## Context

[Describe the architectural problem or opportunity that needs addressing]

## Decision Drivers

- [Driver 1: e.g., performance requirements]
- [Driver 2: e.g., team expertise]
- [Driver 3: e.g., budget constraints]

## Considered Options

- [Option 1: Brief description]
- [Option 2: Brief description]
- [Option 3: Brief description]

## Decision Outcome

**Chosen option**: [Option X] because [primary reasoning]

### Positive Consequences

- [Benefit 1]
- [Benefit 2]

### Negative Consequences

- [Drawback 1 with mitigation plan]
- [Drawback 2 with acceptance reasoning]

## Implementation Notes

[Technical details, migration plans, timeline]

## References

- [Link 1: Related documentation]
- [Link 2: External resources]
- [Link 3: Benchmarks or studies]
```

### Automated Architecture Diagramming

```javascript
// architecture-docs/diagram-generator.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

class ArchitectureDiagramGenerator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.diagramsDir = path.join(projectRoot, "docs/architecture/diagrams");
    this.configPath = path.join(projectRoot, "architecture.config.js");
  }

  async generateAllDiagrams() {
    const config = this.loadConfig();

    await Promise.all([
      this.generateSystemContext(config),
      this.generateContainerDiagram(config),
      this.generateComponentDiagrams(config),
      this.generateDeploymentDiagram(config),
      this.generateDataFlowDiagram(config),
    ]);

    this.generateArchitectureIndex();
  }

  generateSystemContext(config) {
    const mermaidCode = `
graph TB
    User[User] --> WebApp[${config.appName}]
    WebApp --> API[API Service]
    WebApp --> Auth[Authentication]
    API --> Database[(Database)]
    API --> Cache[(Redis Cache)]
    API --> Storage[File Storage]

    %% External Services
    WebApp --> Analytics[Analytics Service]
    Auth --> OAuth[OAuth Provider]
    API --> Payment[Payment Gateway]

    classDef internal fill:#e1f5fe
    classDef external fill:#fff3e0

    class WebApp,API internal
    class Analytics,OAuth,Payment external
`;

    this.writeMermaidDiagram("system-context", mermaidCode);
  }

  generateContainerDiagram(config) {
    const containers = this.scanContainers();

    let mermaidCode = `
graph TB
    subgraph "Frontend"
        React[React App]
        PWA[PWA Shell]
    end

    subgraph "Backend"
        API[API Gateway]
        Auth[Auth Service]
        ${containers.services
          .map((service) => `${service}[${this.formatServiceName(service)}]`)
          .join("\n        ")}
    end

    subgraph "Data Layer"
        ${containers.databases
          .map((db) => `${db}[(${this.formatDbName(db)})]`)
          .join("\n        ")}
    end

    React --> API
    ${this.generateServiceConnections(containers)}
`;

    this.writeMermaidDiagram("container-view", mermaidCode);
  }

  generateComponentDiagrams(config) {
    const components = this.scanComponents();

    Object.entries(components).forEach(([module, moduleComponents]) => {
      const mermaidCode = `
graph TB
    subgraph "${module} Components"
        ${moduleComponents
          .map((comp) => `${comp.name}[${comp.name}]`)
          .join("\n        ")}
    end

    ${this.generateComponentConnections(moduleComponents)}
`;

      this.writeMermaidDiagram(`components-${module}`, mermaidCode);
    });
  }

  generateDeploymentDiagram(config) {
    const deploymentConfig = this.loadDeploymentConfig();

    const mermaidCode = `
graph TB
    subgraph "Production Environment"
        subgraph "CDN"
            CloudFlare[CloudFlare]
        end

        subgraph "Application Tier"
            LB[Load Balancer]
            App1[App Instance 1]
            App2[App Instance 2]
        end

        subgraph "Data Tier"
            PrimaryDB[(Primary Database)]
            ReadReplica[(Read Replica)]
            Redis[(Redis Cluster)]
        end

        subgraph "Monitoring"
            Metrics[Metrics Collection]
            Logs[Log Aggregation]
        end
    end

    CloudFlare --> LB
    LB --> App1
    LB --> App2
    App1 --> PrimaryDB
    App2 --> PrimaryDB
    App1 --> ReadReplica
    App2 --> ReadReplica
    App1 --> Redis
    App2 --> Redis

    App1 --> Metrics
    App2 --> Metrics
    App1 --> Logs
    App2 --> Logs
`;

    this.writeMermaidDiagram("deployment", mermaidCode);
  }

  generateDataFlowDiagram(config) {
    const dataFlows = this.analyzeDataFlows();

    const mermaidCode = `
flowchart TD
    A[User Request] --> B{Authentication}
    B -->|Valid| C[Route Handler]
    B -->|Invalid| D[Auth Error]

    C --> E{Cache Check}
    E -->|Hit| F[Return Cached Data]
    E -->|Miss| G[Database Query]

    G --> H[Process Data]
    H --> I[Update Cache]
    I --> J[Return Response]

    G --> K{Audit Required}
    K -->|Yes| L[Log Activity]
    K -->|No| H

    J --> M[Client State Update]
    M --> N[UI Refresh]

    style A fill:#e8f5e8
    style F fill:#fff2cc
    style J fill:#e8f5e8
`;

    this.writeMermaidDiagram("data-flow", mermaidCode);
  }

  // Helper methods for scanning codebase
  scanContainers() {
    const dockerCompose = this.loadDockerCompose();
    const packageJson = this.loadPackageJson();

    return {
      services: Object.keys(dockerCompose?.services || {}),
      databases: this.extractDatabases(dockerCompose),
      external: this.extractExternalServices(packageJson),
    };
  }

  scanComponents() {
    const srcDir = path.join(this.projectRoot, "src");
    const components = {};

    // Scan React components
    this.walkDirectory(srcDir, (filePath) => {
      if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) {
        const relativePath = path.relative(srcDir, filePath);
        const module = relativePath.split("/")[0];

        if (!components[module]) components[module] = [];

        const componentInfo = this.extractComponentInfo(filePath);
        if (componentInfo) {
          components[module].push(componentInfo);
        }
      }
    });

    return components;
  }

  analyzeDataFlows() {
    // Analyze API routes, database queries, and component data flow
    const routes = this.scanApiRoutes();
    const queries = this.scanDatabaseQueries();
    const componentProps = this.scanComponentProps();

    return {
      apiFlows: routes,
      dataQueries: queries,
      componentFlows: componentProps,
    };
  }

  // Mermaid diagram utilities
  writeMermaidDiagram(name, content) {
    const diagramPath = path.join(this.diagramsDir, `${name}.mmd`);
    const markdownPath = path.join(this.diagramsDir, `${name}.md`);

    // Ensure directory exists
    fs.mkdirSync(this.diagramsDir, { recursive: true });

    // Write Mermaid source
    fs.writeFileSync(diagramPath, content);

    // Generate markdown with embedded diagram
    const markdown = `# ${this.formatTitle(name)}

\`\`\`mermaid
${content}
\`\`\`

**Generated**: ${new Date().toISOString()}
**Last Updated**: ${this.getLastModified()}

## Description

${this.generateDiagramDescription(name)}

## Related Components

${this.generateRelatedComponents(name)}
`;

    fs.writeFileSync(markdownPath, markdown);
  }

  generateArchitectureIndex() {
    const indexContent = `# Architecture Documentation

This documentation is automatically generated from the codebase and configuration.

## System Overview

### Architecture Diagrams

- [System Context](diagrams/system-context.md) - External dependencies and system boundaries
- [Container View](diagrams/container-view.md) - High-level runtime view
- [Component Diagrams](diagrams/) - Internal component structure
- [Deployment](diagrams/deployment.md) - Infrastructure and deployment view
- [Data Flow](diagrams/data-flow.md) - Information flow through the system

### Technology Stack

${this.generateTechStackDoc()}

### Architecture Decisions

${this.generateADRIndex()}

## Maintenance

This documentation is updated automatically on every deployment.
Last updated: ${new Date().toISOString()}

## Contributing

To update architecture documentation:
1. Update the \`architecture.config.js\` file for diagram configuration
2. Add new ADRs to the \`docs/adr/\` directory
3. Run \`npm run docs:generate\` to regenerate diagrams
`;

    fs.writeFileSync(
      path.join(this.projectRoot, "docs/architecture/README.md"),
      indexContent,
    );
  }

  // Configuration and scanning utilities
  loadConfig() {
    try {
      return require(this.configPath);
    } catch (error) {
      return this.generateDefaultConfig();
    }
  }

  generateDefaultConfig() {
    const packageJson = this.loadPackageJson();

    return {
      appName: packageJson.name || "Application",
      version: packageJson.version || "1.0.0",
      description: packageJson.description || "",
      includePaths: ["src/", "api/", "services/"],
      excludePaths: ["node_modules/", "dist/", "build/"],
      diagramTypes: [
        "system-context",
        "containers",
        "components",
        "deployment",
      ],
      updateTriggers: ["package.json", "docker-compose.yml", "src/**/*.ts"],
    };
  }

  loadPackageJson() {
    try {
      return JSON.parse(
        fs.readFileSync(path.join(this.projectRoot, "package.json"), "utf8"),
      );
    } catch (error) {
      return {};
    }
  }

  walkDirectory(dir, callback) {
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir).forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.walkDirectory(filePath, callback);
      } else {
        callback(filePath);
      }
    });
  }
}

module.exports = ArchitectureDiagramGenerator;
```

### Architecture Configuration

```javascript
// architecture.config.js
module.exports = {
  appName: "Kaffeine Mapper",
  description: "Coffee shop mapping and discovery application",

  // Diagram generation settings
  diagrams: {
    outputFormat: ["mermaid", "svg", "png"],
    theme: "neutral",
    updateTriggers: [
      "package.json",
      "docker-compose.yml",
      "src/**/*.{ts,tsx,js,jsx}",
      "api/**/*.{ts,js}",
      "docs/adr/*.md",
    ],
  },

  // System boundaries and external services
  externalServices: [
    { name: "Google Maps API", type: "maps", critical: true },
    { name: "Stripe", type: "payments", critical: false },
    { name: "Auth0", type: "authentication", critical: true },
    { name: "Cloudflare", type: "cdn", critical: true },
    { name: "Sentry", type: "monitoring", critical: false },
  ],

  // Component scanning configuration
  componentScan: {
    patterns: [
      "src/components/**/*.{tsx,jsx}",
      "src/pages/**/*.{tsx,jsx}",
      "src/services/**/*.{ts,js}",
      "api/routes/**/*.{ts,js}",
    ],
    extractDependencies: true,
    includeImports: true,
    trackStateFlow: true,
  },

  // Architecture views to generate
  views: {
    "system-context": {
      focus: "external-dependencies",
      includeUsers: true,
      showDataFlow: false,
    },
    container: {
      focus: "runtime-structure",
      groupBy: "deployment-unit",
      showInteractions: true,
    },
    component: {
      focus: "internal-structure",
      groupBy: "module",
      includeInterfaces: true,
    },
    deployment: {
      focus: "infrastructure",
      includeMonitoring: true,
      showScaling: true,
    },
  },

  // Documentation generation
  documentation: {
    generateReadme: true,
    includeMetrics: true,
    crossReference: true,
    autoUpdateOnChange: true,
    notifyOnStale: true,
  },
};
```

### ADR Management Tool

```javascript
// scripts/adr-manager.js
const fs = require("fs");
const path = require("path");
const readline = require("readline");

class ADRManager {
  constructor(docsPath = "docs/adr") {
    this.adrPath = docsPath;
    this.templatePath = path.join(docsPath, "template.md");
    this.ensureDirectoryExists();
  }

  async createADR() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const title = await this.question(rl, "ADR Title: ");
    const context = await this.question(rl, "Context (brief): ");

    rl.close();

    const adrNumber = this.getNextADRNumber();
    const filename = this.generateFilename(adrNumber, title);
    const content = this.generateADRContent(adrNumber, title, context);

    fs.writeFileSync(path.join(this.adrPath, filename), content);

    console.log(`✅ Created ADR: ${filename}`);
    console.log(`📝 Edit: ${path.join(this.adrPath, filename)}`);
  }

  getNextADRNumber() {
    const files = fs
      .readdirSync(this.adrPath)
      .filter((file) => file.match(/^\d+/))
      .map((file) => parseInt(file.match(/^(\d+)/)[1]))
      .sort((a, b) => b - a);

    return files.length > 0 ? files[0] + 1 : 1;
  }

  generateFilename(number, title) {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");

    return `${number.toString().padStart(4, "0")}-${slug}.md`;
  }

  generateADRContent(number, title, context) {
    const template = this.loadTemplate();
    const date = new Date().toISOString().split("T")[0];

    return template
      .replace(/{{NUMBER}}/g, number.toString().padStart(3, "0"))
      .replace(/{{TITLE}}/g, title)
      .replace(/{{DATE}}/g, date)
      .replace(
        /{{CONTEXT_PLACEHOLDER}}/g,
        context || "[Describe the problem or opportunity]",
      )
      .replace(/{{AUTHOR}}/g, process.env.USER || "Developer");
  }

  loadTemplate() {
    if (fs.existsSync(this.templatePath)) {
      return fs.readFileSync(this.templatePath, "utf8");
    }

    return this.getDefaultTemplate();
  }

  getDefaultTemplate() {
    return `# ADR-{{NUMBER}}: {{TITLE}}

**Status**: Proposed
**Date**: {{DATE}}
**Deciders**: {{AUTHOR}}

## Context

{{CONTEXT_PLACEHOLDER}}

## Decision Drivers

- [Driver 1]
- [Driver 2]
- [Driver 3]

## Considered Options

- [Option 1]
- [Option 2]
- [Option 3]

## Decision Outcome

**Chosen option**: [Selected option] because [reasoning]

### Positive Consequences

- [Benefit 1]
- [Benefit 2]

### Negative Consequences

- [Drawback 1 - mitigation]
- [Drawback 2 - acceptance]

## Implementation Notes

[Technical details, timeline, migration plan]

## References

- [Link 1]
- [Link 2]
`;
  }

  question(rl, prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(this.adrPath)) {
      fs.mkdirSync(this.adrPath, { recursive: true });
    }
  }

  listADRs() {
    const adrs = fs
      .readdirSync(this.adrPath)
      .filter((file) => file.endsWith(".md") && file.match(/^\d+/))
      .sort();

    console.log("\n📋 Architecture Decision Records:\n");

    adrs.forEach((file) => {
      const content = fs.readFileSync(path.join(this.adrPath, file), "utf8");
      const titleMatch = content.match(/^# ADR-\d+: (.+)$/m);
      const statusMatch = content.match(/\*\*Status\*\*: (.+)$/m);

      const title = titleMatch ? titleMatch[1] : "Unknown";
      const status = statusMatch ? statusMatch[1] : "Unknown";

      console.log(`  ${file}: ${title} (${status})`);
    });
  }
}

// CLI usage
if (require.main === module) {
  const adrManager = new ADRManager();

  const command = process.argv[2];

  switch (command) {
    case "create":
      adrManager.createADR();
      break;
    case "list":
      adrManager.listADRs();
      break;
    default:
      console.log("Usage: node adr-manager.js [create|list]");
  }
}

module.exports = ADRManager;
```

### Package.json Integration

```json
{
  "scripts": {
    "docs:generate": "node scripts/generate-architecture-docs.js",
    "docs:diagrams": "node scripts/diagram-generator.js",
    "adr:create": "node scripts/adr-manager.js create",
    "adr:list": "node scripts/adr-manager.js list",
    "docs:validate": "node scripts/validate-documentation.js",
    "docs:serve": "npx http-server docs -p 3001",
    "postinstall": "npm run docs:generate"
  },
  "devDependencies": {
    "@mermaid-js/mermaid-cli": "^10.6.1",
    "madge": "^6.1.0",
    "dependency-cruiser": "^13.1.5",
    "documentation": "^14.0.2"
  }
}
```

### GitHub Actions Integration

```yaml
# .github/workflows/documentation.yml
name: Architecture Documentation

on:
  push:
    branches: [main, develop]
    paths:
      - "src/**"
      - "api/**"
      - "package.json"
      - "architecture.config.js"
  pull_request:
    branches: [main]

jobs:
  update-docs:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Generate architecture documentation
        run: |
          npm run docs:generate
          npm run docs:diagrams

      - name: Validate documentation
        run: npm run docs:validate

      - name: Check for changes
        id: verify-changed-files
        run: |
          if [ -n "$(git status --porcelain docs/)" ]; then
            echo "docs_changed=true" >> $GITHUB_OUTPUT
          fi

      - name: Commit documentation updates
        if: steps.verify-changed-files.outputs.docs_changed == 'true'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/
          git commit -m "📚 Update architecture documentation [skip ci]" || exit 0
          git push

      - name: Deploy to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
          destination_dir: architecture
```

### Documentation Validation

```javascript
// scripts/validate-documentation.js
const fs = require("fs");
const path = require("path");

class DocumentationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validate() {
    this.checkADRs();
    this.checkDiagrams();
    this.checkStaleDocumentation();
    this.checkCrossReferences();

    this.reportResults();

    return this.errors.length === 0;
  }

  checkADRs() {
    const adrPath = "docs/adr";
    if (!fs.existsSync(adrPath)) {
      this.errors.push("ADR directory does not exist");
      return;
    }

    const adrs = fs.readdirSync(adrPath).filter((file) => file.endsWith(".md"));

    adrs.forEach((adr) => {
      const content = fs.readFileSync(path.join(adrPath, adr), "utf8");

      // Check required sections
      const requiredSections = [
        "Context",
        "Decision Drivers",
        "Considered Options",
        "Decision Outcome",
        "Implementation Notes",
      ];

      requiredSections.forEach((section) => {
        if (!content.includes(`## ${section}`)) {
          this.errors.push(`${adr}: Missing required section "${section}"`);
        }
      });

      // Check for placeholder content
      if (content.includes("[TODO]") || content.includes("[TBD]")) {
        this.warnings.push(`${adr}: Contains placeholder content`);
      }
    });
  }

  checkDiagrams() {
    const diagramPath = "docs/architecture/diagrams";
    if (!fs.existsSync(diagramPath)) {
      this.errors.push("Architecture diagrams directory does not exist");
      return;
    }

    const requiredDiagrams = [
      "system-context.md",
      "container-view.md",
      "deployment.md",
    ];

    requiredDiagrams.forEach((diagram) => {
      const diagramFile = path.join(diagramPath, diagram);
      if (!fs.existsSync(diagramFile)) {
        this.errors.push(`Missing required diagram: ${diagram}`);
      }
    });
  }

  checkStaleDocumentation() {
    const docFiles = this.findDocumentationFiles();
    const codeFiles = this.findSourceFiles();

    const latestCodeChange = Math.max(
      ...codeFiles.map((f) => fs.statSync(f).mtime.getTime()),
    );

    docFiles.forEach((docFile) => {
      const docModified = fs.statSync(docFile).mtime.getTime();
      const daysSinceUpdate =
        (Date.now() - docModified) / (1000 * 60 * 60 * 24);

      if (docModified < latestCodeChange && daysSinceUpdate > 7) {
        this.warnings.push(
          `${docFile}: May be stale (last updated ${Math.floor(daysSinceUpdate)} days ago)`,
        );
      }
    });
  }

  findDocumentationFiles() {
    // Implementation to recursively find .md files in docs/
    const docFiles = [];
    this.walkDir("docs", (file) => {
      if (file.endsWith(".md")) {
        docFiles.push(file);
      }
    });
    return docFiles;
  }

  findSourceFiles() {
    // Implementation to find source files
    const sourceFiles = [];
    ["src", "api", "lib"].forEach((dir) => {
      if (fs.existsSync(dir)) {
        this.walkDir(dir, (file) => {
          if (file.match(/\.(ts|tsx|js|jsx)$/)) {
            sourceFiles.push(file);
          }
        });
      }
    });
    return sourceFiles;
  }

  walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir).forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.walkDir(filePath, callback);
      } else {
        callback(filePath);
      }
    });
  }

  reportResults() {
    console.log("\n📋 Documentation Validation Report\n");

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log("✅ All documentation is valid and up-to-date");
      return;
    }

    if (this.errors.length > 0) {
      console.log("❌ Errors:");
      this.errors.forEach((error) => console.log(`   ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      this.warnings.forEach((warning) => console.log(`   ${warning}`));
    }

    console.log(
      `\nSummary: ${this.errors.length} errors, ${this.warnings.length} warnings`,
    );
  }
}

if (require.main === module) {
  const validator = new DocumentationValidator();
  const isValid = validator.validate();
  process.exit(isValid ? 0 : 1);
}

module.exports = DocumentationValidator;
```

## Architecture Documentation Process

1. **Decision Tracking**
   - Use ADR template for all significant architectural decisions
   - Link decisions to code changes in commit messages
   - Review and update decisions during architectural reviews

2. **Automated Diagram Updates**
   - Diagrams regenerate automatically on code changes
   - Multiple output formats (Mermaid, SVG, PNG) for different audiences
   - Version control integration ensures diagrams stay current

3. **Living Documentation**
   - Documentation builds with every deployment
   - Cross-references between code and documentation maintained
   - Stale documentation detection and alerts

4. **Review Process**
   - Architecture documentation included in code review
   - Quarterly architecture review meetings reference living docs
   - New team member onboarding uses current architecture state

Remember: Architecture documentation should be as automated as possible to ensure it remains accurate and valuable as the system evolves. Focus on capturing decision context and rationale rather than implementation details that change frequently.
