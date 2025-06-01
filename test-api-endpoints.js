#!/usr/bin/env node

import https from 'https';
import http from 'http';
import { URL } from 'url';

const BASE_URL = 'https://bb-dev-func.azurewebsites.net';

const generateTestEmail = () => `test-${Date.now()}@example.com`;

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BrightBoost-API-Tester/1.0',
        ...options.headers
      }
    };

    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

const endpoints = [
  {
    name: 'Hello Test',
    url: '/api/hello',
    method: 'GET',
    authRequired: false,
    expectedKeys: ['message']
  },
  {
    name: 'API Test',
    url: '/api/test',
    method: 'GET',
    authRequired: false,
    expectedKeys: ['message']
  },
  {
    name: 'Environment Test',
    url: '/api/envtest',
    method: 'GET',
    authRequired: false,
    expectedKeys: ['env', 'timestamp']
  },
  {
    name: 'Database Test',
    url: '/api/dbtest',
    method: 'GET',
    authRequired: false,
    expectedKeys: ['users']
  },
  {
    name: 'Debug Endpoint',
    url: '/api/debug',
    method: 'GET',
    authRequired: false,
    expectedKeys: ['lessonCount']
  },
  {
    name: 'User Signup',
    url: '/api/signup',
    method: 'POST',
    authRequired: false,
    expectedKeys: ['user'],
    testData: () => ({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'teacher'
    })
  },
  {
    name: 'User Login',
    url: '/api/login',
    method: 'POST',
    authRequired: false,
    expectedKeys: ['user'],
    testData: () => ({
      email: 'test@example.com',
      password: 'password123'
    })
  },
  {
    name: 'Teacher Dashboard',
    url: '/api/teacher_dashboard',
    method: 'GET',
    authRequired: true,
    expectedKeys: ['lessons', 'students']
  },
  {
    name: 'Student Dashboard',
    url: '/api/student_dashboard',
    method: 'GET',
    authRequired: true,
    expectedKeys: ['lessons', 'activities']
  }
];

async function testEndpoints(authToken = null) {
  console.log('🚀 Testing Bright Boost API Endpoints');
  console.log('=' .repeat(80));
  console.log();

  const results = [];
  let createdUserToken = null;

  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.name} (${endpoint.method} ${endpoint.url})...`);
    
    try {
      const options = {
        method: endpoint.method
      };

      if (endpoint.authRequired) {
        const token = createdUserToken || authToken;
        if (!token) {
          results.push({
            ...endpoint,
            status: 'SKIPPED',
            reason: 'No auth token provided',
            jsonValid: false,
            expectedKeysPresent: false,
            missingKeys: endpoint.expectedKeys
          });
          console.log('  ⚠️  SKIPPED - No auth token provided');
          continue;
        }
        options.headers = { Authorization: `Bearer ${token}` };
      }

      if (endpoint.method === 'POST' && endpoint.testData) {
        options.body = JSON.stringify(endpoint.testData());
      }

      const response = await makeRequest(BASE_URL + endpoint.url, options);
      
      const jsonValid = response.data !== null && !response.parseError;
      
      let expectedKeysPresent = false;
      let missingKeys = [];
      
      if (jsonValid && response.data && endpoint.expectedKeys) {
        missingKeys = endpoint.expectedKeys.filter(key => !(key in response.data));
        expectedKeysPresent = missingKeys.length === 0;
      }

      if ((endpoint.url === '/api/signup' || endpoint.url === '/api/login') && 
          response.status >= 200 && response.status < 300 && 
          response.data && response.data.token) {
        createdUserToken = response.data.token;
      }

      results.push({
        ...endpoint,
        status: response.status,
        jsonValid,
        expectedKeysPresent,
        missingKeys,
        responseData: response.data,
        rawResponse: response.rawData,
        parseError: response.parseError
      });

      const statusIcon = response.status >= 200 && response.status < 300 ? '✅' : '❌';
      console.log(`  ${statusIcon} Status: ${response.status}, JSON: ${jsonValid ? '✅' : '❌'}, Keys: ${expectedKeysPresent ? '✅' : '❌'}`);
      
      if (!jsonValid && response.parseError) {
        console.log(`    Parse Error: ${response.parseError}`);
      }
      
      if (missingKeys.length > 0) {
        console.log(`    Missing Keys: ${missingKeys.join(', ')}`);
      }

    } catch (error) {
      results.push({
        ...endpoint,
        status: 'ERROR',
        error: error.message,
        jsonValid: false,
        expectedKeysPresent: false,
        missingKeys: endpoint.expectedKeys
      });
      console.log(`  ❌ ERROR: ${error.message}`);
    }
    
    console.log();
  }

  console.log('📊 API Endpoint Test Results');
  console.log('=' .repeat(80));
  console.log();
  
  const tableHeader = '| Endpoint URL | Method | Status | Auth Req | JSON | Expected Keys Present | Notes |';
  const tableSeparator = '|' + '-'.repeat(14) + '|' + '-'.repeat(8) + '|' + '-'.repeat(8) + '|' + '-'.repeat(10) + '|' + '-'.repeat(6) + '|' + '-'.repeat(23) + '|' + '-'.repeat(7) + '|';
  
  console.log(tableHeader);
  console.log(tableSeparator);
  
  results.forEach(result => {
    const url = `${BASE_URL}${result.url}`.substring(0, 12) + '...';
    const status = result.status.toString().substring(0, 6);
    const authReq = result.authRequired ? 'yes' : 'no';
    const jsonValid = result.jsonValid ? 'yes' : 'no';
    const keysPresent = result.expectedKeysPresent ? 'yes' : 'no';
    
    let notes = '';
    if (result.status === 'SKIPPED') {
      notes = result.reason;
    } else if (result.status === 'ERROR') {
      notes = 'Connection error';
    } else if (result.missingKeys && result.missingKeys.length > 0) {
      notes = `Missing: ${result.missingKeys.join(', ')}`;
    } else if (result.status >= 200 && result.status < 300) {
      notes = 'Success';
    } else {
      notes = 'Error response';
    }
    
    console.log(`| ${url.padEnd(12)} | ${result.method.padEnd(6)} | ${status.padEnd(6)} | ${authReq.padEnd(8)} | ${jsonValid.padEnd(4)} | ${keysPresent.padEnd(21)} | ${notes.padEnd(5)} |`);
  });
  
  console.log();
  console.log('🔍 Detailed Error Analysis:');
  
  const errors = results.filter(r => r.status >= 400 || r.status === 'ERROR' || !r.jsonValid);
  if (errors.length === 0) {
    console.log('✅ No errors found - all endpoints responding correctly!');
  } else {
    errors.forEach(error => {
      console.log(`\n❌ ${error.name} (${error.url}):`);
      if (error.status === 'ERROR') {
        console.log(`   Connection Error: ${error.error}`);
      } else if (error.status >= 400) {
        console.log(`   HTTP ${error.status}: ${error.rawResponse || 'No response body'}`);
      } else if (!error.jsonValid) {
        console.log(`   Invalid JSON: ${error.parseError}`);
        console.log(`   Raw Response: ${error.rawResponse}`);
      }
    });
  }
  
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const authToken = process.argv[2]; // Optional auth token from command line
  testEndpoints(authToken).catch(console.error);
}

export { testEndpoints, makeRequest };
