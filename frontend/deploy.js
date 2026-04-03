#!/usr/bin/env node

import { execSync } from 'child_process';

try {
    console.log('📦 Building and deploying to GitHub Pages...');
    
    // Use SSH remote for deploy key authentication
    const repoUrl = 'git@github.com:acridgold/STIK-Hackathon-2026.git';
    execSync(`npx gh-pages -d dist -m "Deploy to GitHub Pages" -r "${repoUrl}"`, { 
        stdio: 'inherit'
    });
    
    console.log('✅ Deployment successful!');
    console.log('📍 Check your site at: https://acridgold.github.io/STIK-Hackathon-2026/');
} catch (error) {
    console.error('❌ Deployment failed');
    console.error('💡 Make sure your SSH key is added as a Deploy Key in GitHub repository settings');
    console.error('   Repository Settings → Deploy Keys → Add deploy key');
    process.exit(1);
}
