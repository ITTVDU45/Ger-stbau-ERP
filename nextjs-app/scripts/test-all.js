#!/usr/bin/env node
/**
 * Combined Test Script
 * 
 * Testet alle externen Services (MongoDB, MinIO)
 */

const { spawn } = require('child_process');
const path = require('path');

const tests = [
  { name: 'MongoDB', script: 'test-mongodb.js' },
  { name: 'MinIO', script: 'test-minio.js' }
];

async function runTest(testName, scriptPath) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running ${testName} Test`);
    console.log('='.repeat(60));
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', (error) => {
      console.error(`Failed to run ${testName} test:`, error);
      resolve(false);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting All Service Tests\n');
  
  const results = {};
  
  for (const test of tests) {
    const scriptPath = path.join(__dirname, test.script);
    const success = await runTest(test.name, scriptPath);
    results[test.name] = success;
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  let allPassed = true;
  for (const [name, success] of Object.entries(results)) {
    const status = success ? '✅ PASSED' : '❌ FAILED';
    console.log(`${name}: ${status}`);
    if (!success) allPassed = false;
  }
  
  console.log('='.repeat(60));
  
  if (allPassed) {
    console.log('\n🎉 All tests passed!');
    console.log('Your environment is ready to go!\n');
  } else {
    console.log('\n⚠️  Some tests failed.');
    console.log('Please check the error messages above.\n');
  }
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Unexpected error running tests:', error);
  process.exit(1);
});

