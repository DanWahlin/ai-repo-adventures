#!/bin/bash

# Script to upload only the required GitHub Actions workflow secrets
# These are the environment variables needed by .github/workflows/generate-adventure.yml
# Requires: gh CLI (GitHub CLI) to be installed and authenticated
# To run: ./scripts/upload-workflow-secrets.sh (from project root)

set -e  # Exit on error

# Get the directory of this script and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}GitHub Actions Workflow Secrets Uploader${NC}"
echo "======================================"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found in project root${NC}"
    echo "Expected location: $PROJECT_ROOT/.env"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir &> /dev/null; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Get repository information
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "Repository: ${GREEN}${REPO}${NC}"
echo ""

# Define the required secrets for the workflow
REQUIRED_SECRETS=(
    "REPO_ADV_LLM_API_KEY"
    "REPO_ADV_LLM_BASE_URL"
    "REPO_ADV_LLM_MODEL"
    "REPO_ADV_LLM_API_VERSION"
)

# Preview the secrets that will be uploaded
echo -e "${YELLOW}Secrets required by generate-adventure.yml workflow:${NC}"
echo "======================================"
for secret in "${REQUIRED_SECRETS[@]}"; do
    echo "  - $secret"
done
echo ""

# Check if all required secrets exist in .env
echo "Verifying secrets exist in .env file..."
missing_secrets=()
for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! grep -q "^${secret}=" .env; then
        missing_secrets+=("$secret")
    fi
done

if [ ${#missing_secrets[@]} -gt 0 ]; then
    echo -e "${RED}Error: Missing required secrets in .env:${NC}"
    for secret in "${missing_secrets[@]}"; do
        echo "  - $secret"
    done
    exit 1
fi

# Ask for confirmation
read -p "Do you want to upload these secrets? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Aborted${NC}"
    exit 0
fi

echo ""
echo "Uploading secrets..."
echo "======================================"

# Counter for uploaded secrets
count=0

# Upload each required secret
for secret in "${REQUIRED_SECRETS[@]}"; do
    # Extract value from .env file
    value=$(grep "^${secret}=" .env | cut -d '=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

    # Upload secret
    if echo "$value" | gh secret set "$secret"; then
        echo -e "  ${GREEN}✓${NC} Uploaded: $secret"
        ((count++))
    else
        echo -e "  ${RED}✗${NC} Failed: $secret"
    fi
done

echo ""
echo "======================================"
echo -e "${GREEN}Complete!${NC} Uploaded $count secret(s)"
echo ""
echo "View secrets at: https://github.com/$REPO/settings/secrets/actions"
