#!/usr/bin/env node

/**
 * Documentation checker script for PR Review Bot
 * 
 * This script checks TypeScript files for proper JSDoc documentation
 * on exported functions, classes, and interfaces.
 * 
 * Usage: node check-docs.mjs file1.ts file2.tsx ...
 */

import fs from 'fs';
import path from 'path';

// Get files from command line arguments
const files = process.argv.slice(2);

if (files.length === 0) {
  console.log('No files to check. Usage: node check-docs.mjs file1.ts file2.tsx ...');
  process.exit(0);
}

let hasErrors = false;

// Regular expressions for detecting exports and their documentation
const exportedItemRegex = /export\s+(const|function|class|interface|type|enum)\s+(\w+)/g;
const jsdocRegex = /\/\*\*[\s\S]*?\*\//;

// Check each file
files.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Find all exported items
    const exportMatches = [...content.matchAll(exportedItemRegex)];
    
    exportMatches.forEach(match => {
      const exportType = match[1]; // const, function, class, etc.
      const exportName = match[2]; // name of the exported item
      const exportPosition = match.index;
      
      // Check if there's a JSDoc comment before this export
      const contentBeforeExport = content.substring(0, exportPosition);
      const lastCommentMatch = contentBeforeExport.match(/\/\*\*[\s\S]*?\*\/\s*$/);
      
      if (!lastCommentMatch) {
        console.log(`${filePath}: Missing JSDoc documentation for exported ${exportType} "${exportName}"`);
        hasErrors = true;
      }
    });
    
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error.message}`);
    hasErrors = true;
  }
});

if (hasErrors) {
  console.log('\nDocumentation check failed. Please add JSDoc comments to all exported items.');
  process.exit(1);
} else {
  console.log('Documentation check passed. All exported items have JSDoc comments.');
  process.exit(0);
}
