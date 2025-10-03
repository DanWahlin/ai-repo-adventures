#!/bin/bash

# Script to upload .env variables to GitHub repository secrets
# Requires: gh CLI (GitHub CLI) to be installed and authenticated
# To run: ./upload-secrets.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}GitHub Secrets Uploader${NC}"
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
    echo -e "${RED}Error: .env file not found in current directory${NC}"
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

# Preview the secrets that will be uploaded
echo -e "${YELLOW}Preview of secrets to upload:${NC}"
echo "======================================"
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ $key =~ ^[[:space:]]*# ]] && continue
    [[ -z $key ]] && continue

    # Trim whitespace
    key=$(echo "$key" | xargs)

    echo "  - $key"
done < .env
echo ""

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

# Read .env file and upload each variable
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ $key =~ ^[[:space:]]*# ]] && continue
    [[ -z $key ]] && continue

    # Trim whitespace from key
    key=$(echo "$key" | xargs)

    # Extract value (everything after first =)
    value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

    # Remove quotes from value if present
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

    # Upload secret
    if echo "$value" | gh secret set "$key"; then
        echo -e "  ${GREEN}✓${NC} Uploaded: $key"
        ((count++))
    else
        echo -e "  ${RED}✗${NC} Failed: $key"
    fi
done < .env

echo ""
echo "======================================"
echo -e "${GREEN}Complete!${NC} Uploaded $count secret(s)"
echo ""
echo "View secrets at: https://github.com/$REPO/settings/secrets/actions"
