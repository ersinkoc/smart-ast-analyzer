#!/bin/bash

# Smart AST Analyzer Demo Script
# This script demonstrates various usage patterns of the analyzer

set -e  # Exit on any error

echo "🚀 Smart AST Analyzer Demo"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Smart AST is installed
echo -e "${BLUE}📋 Checking installation...${NC}"
if ! command -v smart-ast &> /dev/null; then
    echo -e "${RED}❌ Smart AST Analyzer not found in PATH${NC}"
    echo "Please install it first:"
    echo "  npm install -g smart-ast-analyzer"
    exit 1
fi

echo -e "${GREEN}✅ Smart AST Analyzer found${NC}"
echo ""

# Check AI CLI availability
echo -e "${BLUE}🤖 Checking AI CLI tools...${NC}"
AI_AVAILABLE=""

if command -v gemini &> /dev/null; then
    echo -e "${GREEN}✅ Gemini CLI available${NC}"
    AI_AVAILABLE="gemini"
elif command -v claude &> /dev/null; then
    echo -e "${GREEN}✅ Claude CLI available${NC}"
    AI_AVAILABLE="claude"
else
    echo -e "${RED}❌ No AI CLI tools found${NC}"
    echo "Please install one of:"
    echo "  npm install -g @google-ai/generativelanguage-cli"
    echo "  npm install -g @anthropic-ai/claude-cli"
    exit 1
fi

echo ""

# Create demo directory
DEMO_DIR="smart-ast-demo"
echo -e "${BLUE}📁 Setting up demo directory: ${DEMO_DIR}${NC}"
mkdir -p "${DEMO_DIR}"
cd "${DEMO_DIR}"

# Demo 1: Basic project scan
echo -e "${YELLOW}📊 Demo 1: Basic Project Information${NC}"
echo "Running: smart-ast analyze --type full --format json --max-files 10"
echo ""

smart-ast analyze \
  --ai "${AI_AVAILABLE}" \
  --type full \
  --format json \
  --max-files 10 \
  --output "./demo-1-basic" \
  --verbose || echo -e "${YELLOW}⚠️  Demo 1 completed with warnings${NC}"

echo ""
echo -e "${GREEN}✅ Demo 1 completed${NC}"
echo "Check results in: ./demo-1-basic/"
echo ""

# Demo 2: API-focused analysis
echo -e "${YELLOW}🔗 Demo 2: API Analysis${NC}"
echo "Running: smart-ast analyze --type api"
echo ""

smart-ast analyze \
  --ai "${AI_AVAILABLE}" \
  --type api \
  --format markdown \
  --output "./demo-2-api" \
  --include "**/*.js,**/*.ts" \
  --exclude "**/*.test.*,**/*.spec.*" || echo -e "${YELLOW}⚠️  Demo 2 completed with warnings${NC}"

echo ""
echo -e "${GREEN}✅ Demo 2 completed${NC}"
echo "Check results in: ./demo-2-api/"
echo ""

# Demo 3: Component analysis
echo -e "${YELLOW}🧩 Demo 3: Component Analysis${NC}"
echo "Running: smart-ast analyze --type components"
echo ""

smart-ast analyze \
  --ai "${AI_AVAILABLE}" \
  --type components \
  --format html \
  --output "./demo-3-components" \
  --include "**/*.jsx,**/*.tsx,**/*.vue" \
  --max-files 15 || echo -e "${YELLOW}⚠️  Demo 3 completed with warnings${NC}"

echo ""
echo -e "${GREEN}✅ Demo 3 completed${NC}"
echo "Check results in: ./demo-3-components/"
echo ""

# Demo 4: Performance analysis
echo -e "${YELLOW}⚡ Demo 4: Performance Analysis${NC}"
echo "Running: smart-ast analyze --type performance"
echo ""

smart-ast analyze \
  --ai "${AI_AVAILABLE}" \
  --type performance \
  --format all \
  --output "./demo-4-performance" \
  --max-files 20 || echo -e "${YELLOW}⚠️  Demo 4 completed with warnings${NC}"

echo ""
echo -e "${GREEN}✅ Demo 4 completed${NC}"
echo "Check results in: ./demo-4-performance/"
echo ""

# Demo 5: Custom configuration
echo -e "${YELLOW}⚙️  Demo 5: Custom Configuration${NC}"
echo "Creating custom config and running analysis..."

cat > .smart-ast-demo.json << EOF
{
  "ai": "${AI_AVAILABLE}",
  "analysis": {
    "type": "full",
    "maxFiles": 25,
    "exclude": [
      "node_modules/**",
      ".git/**",
      "dist/**",
      "build/**",
      "**/*.min.js"
    ]
  },
  "output": {
    "format": "markdown",
    "directory": "./demo-5-custom"
  },
  "cache": {
    "enabled": true
  }
}
EOF

smart-ast analyze --config .smart-ast-demo.json || echo -e "${YELLOW}⚠️  Demo 5 completed with warnings${NC}"

echo ""
echo -e "${GREEN}✅ Demo 5 completed${NC}"
echo "Check results in: ./demo-5-custom/"
echo ""

# Summary
echo -e "${BLUE}📊 Demo Summary${NC}"
echo "==============="
echo ""

# Count generated files
total_files=0
for demo_dir in demo-*; do
    if [ -d "$demo_dir" ]; then
        file_count=$(find "$demo_dir" -type f | wc -l)
        echo "📁 $demo_dir: $file_count files"
        total_files=$((total_files + file_count))
    fi
done

echo ""
echo -e "${GREEN}🎉 All demos completed successfully!${NC}"
echo "📊 Total files generated: $total_files"
echo "📁 Demo directory: $(pwd)"
echo ""

echo -e "${BLUE}💡 Next steps:${NC}"
echo "• Open the HTML reports in your browser for interactive viewing"
echo "• Check the Markdown reports for readable summaries"
echo "• Examine the JSON reports for programmatic access to data"
echo "• Try running the analyzer on your own projects!"
echo ""

echo -e "${BLUE}📚 Useful commands:${NC}"
echo "• smart-ast list-frameworks    # Show supported frameworks"
echo "• smart-ast analyze --help     # Show all options"
echo "• smart-ast init              # Create default configuration"
echo ""

# Optional: Open reports if on macOS or Linux with GUI
if [[ "$OSTYPE" == "darwin"* ]] && command -v open &> /dev/null; then
    echo "🌐 Opening HTML reports in browser..."
    find . -name "*.html" -exec open {} \; 2>/dev/null || true
elif [[ "$OSTYPE" == "linux-gnu"* ]] && command -v xdg-open &> /dev/null; then
    echo "🌐 Opening HTML reports in browser..."
    find . -name "*.html" -exec xdg-open {} \; 2>/dev/null || true
fi

echo -e "${GREEN}✨ Demo complete! Thanks for trying Smart AST Analyzer!${NC}"