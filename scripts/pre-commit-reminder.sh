#!/bin/bash
# Pre-commit reminder to log Claude Code prompts for non-trivial changes.
# Enable by symlinking to .git/hooks/pre-commit (see README below).

CHANGED=$(git diff --cached --name-only | wc -l)
if [ "$CHANGED" -gt 5 ]; then
  echo ""
  echo "📝 Reminder: If you used Claude Code for this change,"
  echo "   please log your prompt in the prompts/ directory."
  echo "   See prompts/_template.md for the format."
  echo ""
fi

# Never block the commit — this is just a nudge.
exit 0
