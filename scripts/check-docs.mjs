import fs from 'fs';
import path from 'path';
import { parse } from '@typescript-eslint/typescript-estree';

async function checkFileDocumentation(filePath) {
    const missingDocs = [];
    try {
        const code = fs.readFileSync(filePath, 'utf-8');
        // Attempt to determine if the file is JSX based on its extension
        const isJsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
        const ast = parse(code, { 
            jsx: isJsx, 
            loc: true, 
            comment: true, // Ensure comments are parsed
            range: true,
            // Set useJSXTextNode to true if you are parsing JSX/TSX
            // and want to represent text content within JSX elements as JSXText nodes
            useJSXTextNode: isJsx 
        });

        for (const node of ast.body) {
            if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
                const declaration = node.declaration;
                let actualNodeToCommentCheck = declaration; // Node whose leading comments we check
                let reportedNodeForMissingDoc = declaration; // Node used in the error message
                let name = 'unknown';
                let exportType = 'item';


                if (declaration.type === 'VariableDeclaration') { 
                    if (declaration.declarations.length > 0) {
                        const varDeclarator = declaration.declarations[0];
                        actualNodeToCommentCheck = declaration; // Comment should be before 'export const ...'
                        reportedNodeForMissingDoc = varDeclarator; 

                        if (varDeclarator.id.type === 'Identifier') {
                           name = varDeclarator.id.name;
                        }
                        if (varDeclarator.init && (varDeclarator.init.type === 'ArrowFunctionExpression' || varDeclarator.init.type === 'FunctionExpression')) {
                            exportType = 'function';
                        } else {
                            exportType = 'variable';
                        }
                    }
                } else if (declaration.type === 'FunctionDeclaration') {
                     if (declaration.id && declaration.id.type === 'Identifier') {
                        name = declaration.id.name;
                     }
                     exportType = 'function';
                     actualNodeToCommentCheck = node; // Comment before 'export function ...' or 'export default function ...'
                     reportedNodeForMissingDoc = declaration;
                } else if (declaration.type === 'ClassDeclaration') {
                    if (declaration.id && declaration.id.type === 'Identifier') {
                        name = declaration.id.name;
                    }
                    exportType = 'class';
                    actualNodeToCommentCheck = node; // Comment before 'export class ...' or 'export default class ...'
                    reportedNodeForMissingDoc = declaration;
                } else if (node.type === 'ExportDefaultDeclaration' && declaration.type === 'Identifier') {
                    // Case: export default foo; (where foo is defined elsewhere)
                    // This is harder to check reliably for comments without resolving imports/references.
                    // For now, we'll assume it's documented or skip.
                    // Or, we can try to find 'foo' in the AST, but that's complex.
                    // Let's assume for now that such exports are less common for direct doc requirements or handled differently.
                    name = declaration.name + " (default export reference)";
                    exportType = 'reference';
                    actualNodeToCommentCheck = node;
                    reportedNodeForMissingDoc = declaration;
                    // To avoid false positives, let's skip direct check for these or require a comment directly above `export default foo;`
                    // For this iteration, we will check the export line itself for a comment.
                } else if (node.type === 'ExportDefaultDeclaration' && (declaration.type === 'ArrowFunctionExpression' || declaration.type === 'FunctionExpression' || declaration.type === 'ClassExpression')) {
                    // export default () => {} or export default function() {} or export default class {}
                     name = declaration.id ? declaration.id.name : 'anonymous';
                     if (declaration.type === 'ArrowFunctionExpression' || declaration.type === 'FunctionExpression') {
                         exportType = 'function';
                     } else {
                         exportType = 'class';
                     }
                     name += " (default export)";
                     actualNodeToCommentCheck = node; // Comment should be before 'export default function/class...'
                     reportedNodeForMissingDoc = declaration;
                }


                if (actualNodeToCommentCheck && reportedNodeForMissingDoc && exportType !== 'reference' && exportType !== 'variable') { // Skip 'reference' type and non-function/class variables for now
                    let hasJSDoc = false;
                    // leadingComments are attached to the node itself by the parser when { comment: true }
                    if (actualNodeToCommentCheck.leadingComments && actualNodeToCommentCheck.leadingComments.length > 0) {
                        for (const comment of actualNodeToCommentCheck.leadingComments) {
                            if (comment.type === 'Block' && comment.value.startsWith('*')) {
                                // Check if the comment is immediately before the node
                                // The parser option `attachComment: true` (default in some versions or implied by `comment: true`)
                                // usually handles this, leadingComments should be the ones directly preceding.
                                // We can add a more precise check if needed by comparing comment.range[1] and node.range[0]
                                // and ensuring no significant code is between them.
                                const textBetween = code.substring(comment.range[1], actualNodeToCommentCheck.range[0]);
                                if (textBetween.trim() === '') {
                                    hasJSDoc = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (!hasJSDoc) {
                        missingDocs.push(`- ${exportType} '${name}' in ${path.basename(filePath)}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Error processing file ${filePath}: ${error.message}`);
        // Check if it's a parsing error to provide a more specific message
        if (error.message.includes("Parsing error")) {
             missingDocs.push(`- Could not parse file ${path.basename(filePath)}. Ensure it's valid TypeScript/JavaScript.`);
        } else {
            missingDocs.push(`- Error processing file ${path.basename(filePath)} (see console for details).`);
        }
    }
    return missingDocs;
}

async function main() {
    const files = process.argv.slice(2);
    if (files.length === 0) {
        console.log("No files to check for documentation.");
        // process.exit(0); // Let's not exit here, allow the workflow to proceed if this script is part of a larger check
        return; 
    }

    let allMissingDocs = [];
    console.log(`Checking documentation for files: ${files.join(', ')}`);

    for (const file of files) {
        const missing = await checkFileDocumentation(file);
        allMissingDocs = allMissingDocs.concat(missing);
    }

    if (allMissingDocs.length > 0) {
        console.log("\nDocumentation check failed. Missing JSDoc comments for:");
        allMissingDocs.forEach(item => console.log(item));
        process.exit(1);
    } else {
        console.log("\nDocumentation check passed. All checked exported items appear to be documented.");
        process.exit(0);
    }
}

main().catch(error => {
    console.error("An unexpected error occurred in check-docs script:", error);
    process.exit(1);
});
