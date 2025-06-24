#!/usr/bin/env node

/**
 * Script to test backend connectivity and endpoints
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Backend-Test-Script/1.0'
      }
    };

    if (data && method !== 'GET') {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🔍 Testing Backend Connectivity...');
  console.log(`Base URL: ${BASE_URL}\n`);

  const tests = [
    { name: 'Root endpoint', path: '/' },
    { name: 'Health check', path: '/api/health' },
    { name: 'Download test endpoint', path: '/api/download/test' },
    { name: 'Info endpoint (should require auth)', path: '/api/info' }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name} (${test.path})`);
      const result = await testEndpoint(test.path);
      
      if (result.status < 400) {
        console.log(`✅ SUCCESS: ${result.status}`);
        if (typeof result.data === 'object') {
          console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
        } else {
          console.log(`   Response: ${result.data.substring(0, 100)}...`);
        }
      } else {
        console.log(`⚠️  WARNING: ${result.status}`);
        console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log('   Backend server is not running or not accessible');
      }
    }
    console.log('');
  }

  console.log('🏁 Test completed!');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };
