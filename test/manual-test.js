#!/usr/bin/env node
/**
 * Manual testing script for Telegram Monitor Vercel deployment
 * Run locally to test all endpoints before deployment
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

class MonitorTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async test(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      const result = await testFn();
      if (result.success) {
        console.log(`✅ PASS: ${result.message || 'Test passed'}`);
        this.results.passed++;
      } else {
        console.log(`❌ FAIL: ${result.message || 'Test failed'}`);
        this.results.failed++;
      }
      this.results.tests.push({ name, ...result });
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, success: false, message: error.message });
    }
  }

  async testStatusEndpoint() {
    const response = await fetch(`${this.baseUrl}/api/status`);
    const data = await response.json();
    
    return {
      success: response.ok && data.status?.operational !== undefined,
      message: response.ok ? 
        `Status endpoint working, operational: ${data.status.operational}` :
        `Status endpoint failed with ${response.status}`,
      data
    };
  }

  async testTelegramConfig() {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      return {
        success: false,
        message: 'Telegram credentials not configured in environment'
      };
    }

    const response = await fetch(`${this.baseUrl}/api/status?test=telegram`);
    const data = await response.json();
    
    return {
      success: response.ok && data.success,
      message: data.success ? 
        'Telegram test message sent successfully' :
        `Telegram test failed: ${data.error}`,
      data
    };
  }

  async testMonitorEndpoint() {
    const response = await fetch(`${this.baseUrl}/api/monitor`, {
      method: 'POST'
    });
    const data = await response.json();
    
    return {
      success: response.ok && data.success,
      message: response.ok ? 
        `Monitoring check completed, ${data.summary?.alertsGenerated || 0} alerts generated` :
        `Monitor endpoint failed with ${response.status}`,
      data
    };
  }

  async testWebhookEndpoint() {
    const testPayload = {
      message: 'Test webhook alert from automated testing',
      severity: 'low',
      source: 'Test Suite',
      secret: process.env.WEBHOOK_SECRET || 'test-secret'
    };

    const response = await fetch(`${this.baseUrl}/api/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.WEBHOOK_SECRET || 'test-secret'
      },
      body: JSON.stringify(testPayload)
    });
    
    const data = await response.json();
    
    return {
      success: response.ok && data.success,
      message: response.ok ? 
        'Webhook endpoint processed test alert successfully' :
        `Webhook test failed: ${data.error}`,
      data
    };
  }

  async testEnvironmentVariables() {
    const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
    const optional = ['MONITOR_ENDPOINTS', 'WEBHOOK_SECRET'];
    
    const missing = required.filter(var_name => !process.env[var_name]);
    const configured = optional.filter(var_name => process.env[var_name]);
    
    return {
      success: missing.length === 0,
      message: missing.length === 0 ?
        `All required variables set. Optional configured: ${configured.join(', ')}` :
        `Missing required variables: ${missing.join(', ')}`,
      data: {
        required: required.map(name => ({ name, set: !!process.env[name] })),
        optional: optional.map(name => ({ name, set: !!process.env[name] }))
      }
    };
  }

  async testCorsHeaders() {
    const response = await fetch(`${this.baseUrl}/api/status`, {
      method: 'OPTIONS'
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers')
    };
    
    return {
      success: response.ok && corsHeaders['access-control-allow-origin'],
      message: response.ok && corsHeaders['access-control-allow-origin'] ?
        'CORS headers configured correctly' :
        'CORS headers missing or incorrect',
      data: corsHeaders
    };
  }

  async testEndpointMonitoring() {
    // Test with a reliable endpoint
    const testEndpoints = ['https://httpbin.org/status/200', 'https://httpbin.org/status/500'];
    
    // Temporarily set endpoints for testing
    const originalEndpoints = process.env.MONITOR_ENDPOINTS;
    process.env.MONITOR_ENDPOINTS = testEndpoints.join(',');
    
    const response = await fetch(`${this.baseUrl}/api/monitor`, {
      method: 'POST'
    });
    
    // Restore original endpoints
    if (originalEndpoints) {
      process.env.MONITOR_ENDPOINTS = originalEndpoints;
    } else {
      delete process.env.MONITOR_ENDPOINTS;
    }
    
    const data = await response.json();
    
    return {
      success: response.ok && data.success && data.summary?.endpointsChecked > 0,
      message: response.ok && data.summary ?
        `Endpoint monitoring working, checked ${data.summary.endpointsChecked} endpoints` :
        'Endpoint monitoring test failed',
      data
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Telegram Monitor Vercel Tests');
    console.log(`📍 Base URL: ${this.baseUrl}`);
    console.log('=' * 50);

    await this.test('Environment Variables', () => this.testEnvironmentVariables());
    await this.test('Status Endpoint', () => this.testStatusEndpoint());
    await this.test('CORS Headers', () => this.testCorsHeaders());
    await this.test('Monitor Endpoint', () => this.testMonitorEndpoint());
    await this.test('Webhook Endpoint', () => this.testWebhookEndpoint());
    await this.test('Endpoint Monitoring', () => this.testEndpointMonitoring());
    
    // Only test Telegram if credentials are available
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      await this.test('Telegram Integration', () => this.testTelegramConfig());
    } else {
      console.log('\n⏭️  Skipping Telegram test (credentials not configured)');
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '=' * 50);
    console.log('📊 Test Summary');
    console.log('=' * 50);
    
    const total = this.results.passed + this.results.failed;
    const passRate = ((this.results.passed / total) * 100).toFixed(1);
    
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => !test.success)
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.message}`);
        });
    }
    
    console.log('\n🎯 Next Steps:');
    if (this.results.failed === 0) {
      console.log('   ✅ All tests passed! Ready for deployment.');
      console.log('   🚀 Run: vercel --prod');
    } else {
      console.log('   🔧 Fix failing tests before deployment');
      console.log('   📖 Check DEPLOYMENT.md for troubleshooting');
    }
    
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests
const tester = new MonitorTester(process.argv[2]);
tester.runAllTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});