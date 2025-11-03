// scripts/generate-metadata.js
const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = './templates';
const OUTPUT_FILE = './data/templates.json';
const PREVIEWS_DIR = './previews';

/**
 * Extract tags from markdown content
 * Tags can be from badges, technology names, keywords
 */
function extractTagsFromMarkdown(content) {
    const tags = new Set();
    
    // Extract from badge URLs (img.shields.io badges)
    const badgeRegex = /badge[/-]([^-?&\s]+)/gi;
    let match;
    while ((match = badgeRegex.exec(content)) !== null) {
        const tag = match[1].toLowerCase()
            .replace(/[%20_]/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        if (tag && tag.length > 2 && tag.length < 20) {
            tags.add(tag);
        }
    }
    
    // Extract from logo= parameters in badges
    const logoRegex = /logo=([a-z0-9-]+)/gi;
    while ((match = logoRegex.exec(content)) !== null) {
        const tag = match[1].toLowerCase();
        if (tag && tag.length > 2) {
            tags.add(tag);
        }
    }
    
    // Common technologies to look for
    const techKeywords = [
        'python', 'javascript', 'typescript', 'java', 'cpp', 'c++', 'csharp', 'c#',
        'react', 'vue', 'angular', 'nodejs', 'node', 'express', 'django', 'flask',
        'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap',
        'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'github',
        'mongodb', 'postgresql', 'mysql', 'redis', 'graphql', 'rest', 'api',
        'tensorflow', 'pytorch', 'machine-learning', 'ml', 'ai', 'data-science',
        'linux', 'bash', 'shell', 'vim', 'vscode', 'jetbrains',
        'golang', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'dart', 'flutter'
    ];
    
    const contentLower = content.toLowerCase();
    techKeywords.forEach(keyword => {
        if (contentLower.includes(keyword)) {
            tags.add(keyword);
        }
    });
    
    // Extract from markdown links and images
    const linkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
    while ((match = linkRegex.exec(content)) !== null) {
        const linkText = match[1].toLowerCase();
        techKeywords.forEach(keyword => {
            if (linkText.includes(keyword)) {
                tags.add(keyword);
            }
        });
    }
    
    // Limit to most relevant tags (max 10)
    return Array.from(tags).slice(0, 10);
}

/**
 * Check if preview image exists for template
 */
function checkPreviewExists(username, category) {
    const possibleExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg'];
    
    for (const ext of possibleExtensions) {
        const filename = `${category}-${username}${ext}`;
        const previewPath = path.join(PREVIEWS_DIR, filename);
        if (fs.existsSync(previewPath)) {
            return `previews/${filename}`;
        }
    }
    
    return false;
}

/**
 * Scan templates directory and extract metadata
 */
function scanTemplatesDirectory(dir) {
    const templatesData = [];
    
    const categories = fs.readdirSync(dir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    categories.forEach(category => {
        const categoryPath = path.join(dir, category);
        
        const files = fs.readdirSync(categoryPath)
            .filter(file => file.endsWith('.md'))
            .sort();

        files.forEach(file => {
            const username = file.replace('.md', '');
            const filePath = path.join(categoryPath, file);
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const tags = extractTagsFromMarkdown(content);
                const preview_url = checkPreviewExists(username, category);
                
                // Keep category temporarily for enrichMetadata
                templatesData.push({
                    category: category,
                    username: username,
                    tags: tags,
                    preview_url: preview_url
                });
            } catch (error) {
                console.warn(`⚠️  Failed to process ${filePath}:`, error.message);
            }
        });
    });
    
    return templatesData;
}

/**
 * Generate enriched metadata structure
 */
function enrichMetadata(templatesData) {
    const categories = {};
    
    // Group by category - templates are already organized by category during scan
    templatesData.forEach(item => {
        const category = item.category;
        if (!categories[category]) {
            categories[category] = {
                count: 0,
                templates: []
            };
        }
        categories[category].count++;
        categories[category].templates.push({
            username: item.username,
            tags: item.tags,
            preview_url: item.preview_url
        });
    });
    
    const metadata = {
        lastUpdated: new Date().toISOString(),
        totalTemplates: templatesData.length,
        totalCategories: Object.keys(categories).length,
        categories: categories
    };
    
    return metadata;
}

/**
 * Main function to generate metadata
 */
function generateMetadata() {
    try {
        console.log('🔍 Scanning templates directory...');
        
        if (!fs.existsSync(TEMPLATES_DIR)) {
            console.error(`❌ Templates directory not found: ${TEMPLATES_DIR}`);
            process.exit(1);
        }
        
        console.log('📖 Reading markdown files and extracting metadata...');
        const templates = scanTemplatesDirectory(TEMPLATES_DIR);
        
        console.log('🏗️  Building metadata structure...');
        const metadata = enrichMetadata(templates);
        
        // Ensure data directory exists
        const dataDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Write data/templates.json with enriched metadata format
        fs.writeFileSync(
            OUTPUT_FILE,
            JSON.stringify(metadata, null, 2),
            'utf8'
        );
        
        console.log('\n✅ Metadata generation complete!');
        console.log(`📊 Total templates: ${metadata.totalTemplates}`);
        console.log(`📁 Total categories: ${metadata.totalCategories}`);
        console.log(`📄 Output file: ${OUTPUT_FILE}`);
        console.log('\nCategory breakdown:');
        Object.entries(metadata.categories).forEach(([category, data]) => {
            console.log(`   - ${category}: ${data.count} templates`);
        });
        
    } catch (error) {
        console.error('❌ Error generating metadata:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run
if (require.main === module) {
    generateMetadata();
}

module.exports = { generateMetadata, extractTagsFromMarkdown, checkPreviewExists };