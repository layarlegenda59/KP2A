#!/usr/bin/env node

/**
 * Deployment Helper Script for KP2A Cimahi
 * This script helps prepare and deploy the application to Vercel
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 KP2A Cimahi Deployment Helper\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: package.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Check if vercel.json exists
if (!fs.existsSync('vercel.json')) {
  console.error('❌ Error: vercel.json not found. Please ensure Vercel configuration is present.');
  process.exit(1);
}

try {
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('\n🔍 Running build test...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('\n✅ Build successful! Your app is ready for deployment.');
  
  console.log('\n📋 Next steps:');
  console.log('1. Push your code to GitHub:');
  console.log('   git add .');
  console.log('   git commit -m "Ready for deployment"');
  console.log('   git push origin main');
  console.log('');
  console.log('2. Deploy to Vercel:');
  console.log('   - Visit https://vercel.com');
  console.log('   - Import your GitHub repository');
  console.log('   - Add environment variables (see DEPLOYMENT.md)');
  console.log('   - Deploy!');
  console.log('');
  console.log('📖 For detailed instructions, see DEPLOYMENT.md');
  
} catch (error) {
  console.error('\n❌ Build failed! Please fix the errors before deploying.');
  console.error('Error details:', error.message);
  process.exit(1);
}

console.log('\n🎉 Deployment preparation complete!');