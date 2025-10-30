#!/usr/bin/env node

/**
 * Setup script for Supabase database
 * Run this script to initialize the database with required tables and functions
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Legal Chatbot Database Setup');
console.log('================================');

console.log('\n📋 Database Setup Instructions:');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Run the following SQL scripts in order:');

console.log('\n🔧 Step 1: Enable pgvector extension');
console.log('Run this SQL command:');
console.log('CREATE EXTENSION IF NOT EXISTS vector;');

console.log('\n📄 Step 2: Create tables and policies');
console.log('Copy and run the contents of: database/schema.sql');

console.log('\n⚙️ Step 3: Create functions');
console.log('Copy and run the contents of: database/functions.sql');

console.log('\n✅ Step 4: Verify setup');
console.log('Run these queries to verify:');
console.log('- SELECT * FROM laws LIMIT 1;');
console.log('- SELECT * FROM profiles LIMIT 1;');
console.log('- SELECT * FROM query_logs LIMIT 1;');

console.log('\n🔑 Step 5: Create admin user');
console.log('1. Sign up through the web interface');
console.log('2. Update the user role to admin:');
console.log('   UPDATE profiles SET role = \'admin\' WHERE id = \'your-user-id\';');

console.log('\n📚 Next Steps:');
console.log('- Start the application: npm run dev');
console.log('- Visit http://localhost:3000');
console.log('- Sign up and get admin access');
console.log('- Upload your first legal documents!');

console.log('\n🎉 Setup complete! Happy coding!');
