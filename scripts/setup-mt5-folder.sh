#!/bin/bash

# Setup script for MT5 custom reports folder

echo "🔧 Setting up MT5 Reports folder..."

# Default custom folder in Documents
DEFAULT_FOLDER="$HOME/Documents/MT5-Reports"

# Ask user for custom folder
read -p "Enter custom folder path (or press Enter for default: $DEFAULT_FOLDER): " CUSTOM_FOLDER

if [ -z "$CUSTOM_FOLDER" ]; then
    CUSTOM_FOLDER="$DEFAULT_FOLDER"
fi

# Create folder if it doesn't exist
mkdir -p "$CUSTOM_FOLDER"

if [ $? -eq 0 ]; then
    echo "✅ Created folder: $CUSTOM_FOLDER"
    
    # Add to shell profile
    SHELL_PROFILE="$HOME/.zshrc"  # For zsh (default on Mac)
    if [ -f "$HOME/.bash_profile" ]; then
        SHELL_PROFILE="$HOME/.bash_profile"  # For bash
    fi
    
    # Check if already added
    if ! grep -q "MT5_REPORTS_PATH" "$SHELL_PROFILE"; then
        echo "" >> "$SHELL_PROFILE"
        echo "# MT5 Reports folder" >> "$SHELL_PROFILE"
        echo "export MT5_REPORTS_PATH=\"$CUSTOM_FOLDER\"" >> "$SHELL_PROFILE"
        echo "✅ Added to $SHELL_PROFILE"
        echo ""
        echo "📝 Next steps:"
        echo "1. Reload your shell: source $SHELL_PROFILE"
        echo "2. Configure MT5 to export reports to: $CUSTOM_FOLDER"
        echo "3. Run: npm run mt5:watch"
    else
        echo "⚠️  MT5_REPORTS_PATH already set in $SHELL_PROFILE"
    fi
else
    echo "❌ Failed to create folder"
    exit 1
fi

