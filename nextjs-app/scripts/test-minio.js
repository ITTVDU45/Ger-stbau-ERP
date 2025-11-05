#!/usr/bin/env node
/**
 * MinIO Connection Test Script
 * 
 * Testet die Verbindung zum MinIO/S3 Storage
 */

const Minio = require('minio');
require('dotenv').config();

// Parse MinIO endpoint (kann URL oder einfacher Hostname sein)
let MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
let MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10);
let MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';

// Wenn MINIO_ENDPOINT eine URL ist, parse sie
if (MINIO_ENDPOINT.startsWith('http://') || MINIO_ENDPOINT.startsWith('https://')) {
  try {
    const url = new URL(MINIO_ENDPOINT);
    MINIO_ENDPOINT = url.hostname;
    MINIO_PORT = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
    MINIO_USE_SSL = url.protocol === 'https:';
  } catch (error) {
    console.error('Failed to parse MINIO_ENDPOINT URL:', error.message);
  }
}

const MINIO_ACCESS_KEY = process.env.MINIO_ROOT_USER || process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_ROOT_PASSWORD || process.env.MINIO_SECRET_KEY || 'minioadmin';
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'gutachter';

async function testMinIOConnection() {
  console.log('🔍 MinIO/S3 Connection Test\n');
  console.log('Configuration:');
  console.log(`  Endpoint: ${MINIO_ENDPOINT}:${MINIO_PORT}`);
  console.log(`  Access Key: ${MINIO_ACCESS_KEY}`);
  console.log(`  Use SSL: ${MINIO_USE_SSL}`);
  console.log(`  Bucket: ${MINIO_BUCKET}\n`);

  try {
    // Create MinIO client
    console.log('📡 Creating MinIO client...');
    const minioClient = new Minio.Client({
      endPoint: MINIO_ENDPOINT,
      port: MINIO_PORT,
      useSSL: MINIO_USE_SSL,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    });
    console.log('✅ MinIO client created!\n');

    // Test connection by listing buckets
    console.log('🗂️  Listing buckets...');
    const buckets = await minioClient.listBuckets();
    console.log(`✅ Found ${buckets.length} bucket(s):`);
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (created: ${bucket.creationDate})`);
    });

    // Check if our bucket exists
    console.log(`\n🔍 Checking if bucket '${MINIO_BUCKET}' exists...`);
    const bucketExists = await minioClient.bucketExists(MINIO_BUCKET);
    
    if (bucketExists) {
      console.log(`✅ Bucket '${MINIO_BUCKET}' exists!`);
    } else {
      console.log(`⚠️  Bucket '${MINIO_BUCKET}' does not exist. Creating it...`);
      await minioClient.makeBucket(MINIO_BUCKET, 'eu-west-1');
      console.log(`✅ Bucket '${MINIO_BUCKET}' created successfully!`);
    }

    // Test upload
    console.log('\n🧪 Testing file upload...');
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = 'This is a test file from MinIO connection test';
    const buffer = Buffer.from(testContent, 'utf-8');
    
    await minioClient.putObject(
      MINIO_BUCKET,
      testFileName,
      buffer,
      buffer.length,
      {
        'Content-Type': 'text/plain',
        'X-Test': 'true'
      }
    );
    console.log(`✅ Successfully uploaded test file: ${testFileName}`);

    // Test download
    console.log('\n📥 Testing file download...');
    const stream = await minioClient.getObject(MINIO_BUCKET, testFileName);
    let downloadedContent = '';
    
    await new Promise((resolve, reject) => {
      stream.on('data', chunk => {
        downloadedContent += chunk.toString();
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    
    if (downloadedContent === testContent) {
      console.log('✅ File content matches! Download successful.');
    } else {
      console.log('⚠️  Downloaded content does not match original');
    }

    // Get file info
    console.log('\n📊 File statistics:');
    const stat = await minioClient.statObject(MINIO_BUCKET, testFileName);
    console.log(`   Size: ${stat.size} bytes`);
    console.log(`   ETag: ${stat.etag}`);
    console.log(`   Last Modified: ${stat.lastModified}`);
    console.log(`   Content-Type: ${stat.metaData['content-type']}`);

    // List objects in bucket
    console.log(`\n📂 Listing objects in bucket '${MINIO_BUCKET}'...`);
    const objectsStream = minioClient.listObjects(MINIO_BUCKET, '', true);
    const objects = [];
    
    await new Promise((resolve, reject) => {
      objectsStream.on('data', obj => objects.push(obj));
      objectsStream.on('end', resolve);
      objectsStream.on('error', reject);
    });
    
    console.log(`✅ Found ${objects.length} object(s):`);
    objects.forEach(obj => {
      console.log(`   - ${obj.name} (${obj.size} bytes)`);
    });

    // Clean up test file
    console.log('\n🧹 Cleaning up test file...');
    await minioClient.removeObject(MINIO_BUCKET, testFileName);
    console.log('✅ Test file removed');

    console.log('\n✅ All MinIO tests passed!');
    return true;

  } catch (error) {
    console.error('\n❌ MinIO Connection Error:');
    console.error(`   ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Make sure MinIO is running');
      console.error('   2. Check if the endpoint and port are correct');
      console.error('   3. Verify access credentials');
      console.error('   4. Default MinIO runs on port 9000');
    } else if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check your MINIO_ACCESS_KEY');
      console.error('   2. Check your MINIO_SECRET_KEY');
      console.error('   3. Default credentials are usually minioadmin/minioadmin');
    }
    
    return false;
  }
}

// Run the test
testMinIOConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

