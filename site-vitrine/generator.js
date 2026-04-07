#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * R3STO Restaurant Website Generator
 * Generates a static HTML restaurant website from a JSON config
 *
 * Usage:
 *   node generator.js config.json output.html
 *   node generator.js path/to/config.json path/to/output.html
 */

function generateRestaurantWebsite(configPath, outputPath) {
    // Validate input arguments
    if (!configPath || !outputPath) {
        console.error('Usage: node generator.js <config.json> <output.html>');
        process.exit(1);
    }

    // Resolve absolute paths
    const configFile = path.resolve(configPath);
    const outputFile = path.resolve(outputPath);

    // Check if config file exists
    if (!fs.existsSync(configFile)) {
        console.error(`Error: Config file not found: ${configFile}`);
        process.exit(1);
    }

    try {
        // Read configuration
        console.log(`📖 Reading config: ${configFile}`);
        const configData = fs.readFileSync(configFile, 'utf-8');
        const config = JSON.parse(configData);

        // Validate required fields
        const requiredFields = ['name', 'slug', 'description'];
        const missingFields = requiredFields.filter(field => !config[field]);
        if (missingFields.length > 0) {
            console.error(`Error: Missing required fields in config: ${missingFields.join(', ')}`);
            process.exit(1);
        }

        // Read template
        const templatePath = path.join(__dirname, 'template.html');
        if (!fs.existsSync(templatePath)) {
            console.error(`Error: Template file not found: ${templatePath}`);
            process.exit(1);
        }

        console.log(`🎨 Reading template: ${templatePath}`);
        let template = fs.readFileSync(templatePath, 'utf-8');

        // Extract the config object from template (between the first <script> tag)
        const configStartMarker = 'const RESTAURANT = {';
        const configStart = template.indexOf(configStartMarker);
        const configEnd = template.indexOf('};', configStart) + 2;

        if (configStart === -1 || configEnd === -1) {
            console.error('Error: Could not find RESTAURANT config in template');
            process.exit(1);
        }

        // Replace the config object
        const newConfig = `const RESTAURANT = ${JSON.stringify(config, null, 4)};`;
        template = template.substring(0, configStart) + newConfig + template.substring(configEnd);

        // Update page title
        const titleMatch = template.match(/<title>[^<]*<\/title>/);
        if (titleMatch) {
            template = template.replace(
                titleMatch[0],
                `<title>${config.name} - Restaurant</title>`
            );
        }

        // Update meta description
        const descMatch = template.match(/<meta name="description" content="[^"]*">/);
        if (descMatch) {
            template = template.replace(
                descMatch[0],
                `<meta name="description" content="${config.description.substring(0, 160)}">`
            );
        }

        // Create output directory if it doesn't exist
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write output file
        console.log(`✍️  Writing output: ${outputFile}`);
        fs.writeFileSync(outputFile, template, 'utf-8');

        // Success message
        console.log(`\n✅ Website generated successfully!`);
        console.log(`   Restaurant: ${config.name}`);
        console.log(`   Slug: ${config.slug}`);
        console.log(`   Output: ${outputFile}`);
        console.log(`   File size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);

    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error(`Error: Invalid JSON in config file: ${error.message}`);
        } else {
            console.error(`Error: ${error.message}`);
        }
        process.exit(1);
    }
}

// Get command line arguments
const args = process.argv.slice(2);
const configPath = args[0];
const outputPath = args[1];

// Run generator
generateRestaurantWebsite(configPath, outputPath);
