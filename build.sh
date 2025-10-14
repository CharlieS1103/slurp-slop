#!/bin/bash

# SlopSlurp Extension Build Script
# Quick build and reload script for development

set -e

echo "🏗️  Building SlopSlurp Extension..."

# Clean and build
npm run build:dev

echo "✅ Build complete!"
echo "📁 Extension files are in the 'dist/' directory"
echo ""
echo "🔄 To reload in Chrome:"
echo "   1. Go to chrome://extensions/"
echo "   2. Click the reload button on SlopSlurp"
echo ""
echo "📦 To package for distribution:"
echo "   npm run package"