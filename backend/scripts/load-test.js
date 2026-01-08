#!/usr/bin/env node
/**
 * GharBazaar API Load Testing Script
 * 
 * Installation:
 *   npm install -g autocannon
 *   OR
 *   npm install -D autocannon
 * 
 * Usage:
 *   node scripts/load-test.js [--url http://localhost:5000] [--duration 30]
 */

const BASE_URL = process.env.API_URL || process.argv.find(a => a.startsWith('--url='))?.split('=')[1] || 'http://localhost:5000';
const DURATION = parseInt(process.argv.find(a => a.startsWith('--duration='))?.split('=')[1] || '30');

const TESTS = [
    {
        name: 'Health Check',
        url: `${BASE_URL}/health`,
        connections: 200,
        duration: 10,
    },
    {
        name: 'Property Search',
        url: `${BASE_URL}/api/v1/properties/search?city=Mumbai&limit=20`,
        connections: 100,
        duration: DURATION,
    },
    {
        name: 'Trending Properties',
        url: `${BASE_URL}/api/v1/properties/trending`,
        connections: 50,
        duration: DURATION,
    },
];

async function runTest(config) {
    const autocannon = require('autocannon');
    
    console.log(`\n📊 Running: ${config.name}`);
    console.log(`   URL: ${config.url}`);
    console.log(`   Connections: ${config.connections}`);
    console.log(`   Duration: ${config.duration}s`);
    console.log('   Starting...\n');

    return new Promise((resolve) => {
        const instance = autocannon({
            url: config.url,
            connections: config.connections || 10,
            duration: config.duration || 10,
            pipelining: config.pipelining || 1,
            method: config.method || 'GET',
            headers: config.headers,
            body: config.body,
        });

        autocannon.track(instance, { renderProgressBar: true });

        instance.on('done', (result) => {
            console.log('\n📈 Results:');
            console.log(`   Requests/sec: ${result.requests.average.toFixed(2)}`);
            console.log(`   Latency (avg): ${result.latency.average.toFixed(2)}ms`);
            console.log(`   Latency (p50): ${result.latency.p50}ms`);
            console.log(`   Latency (p99): ${result.latency.p99}ms`);
            console.log(`   Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
            console.log(`   Errors: ${result.errors}`);
            console.log(`   Timeouts: ${result.timeouts}`);
            console.log(`   2xx: ${result['2xx']}`);
            console.log(`   Non-2xx: ${result.non2xx}`);

            // Performance assessment
            if (result.latency.p99 < 100) {
                console.log('   ✅ EXCELLENT - Sub-100ms p99 latency');
            } else if (result.latency.p99 < 300) {
                console.log('   ✅ GOOD - Under 300ms p99 latency');
            } else if (result.latency.p99 < 500) {
                console.log('   ⚠️ ACCEPTABLE - Under 500ms p99 latency');
            } else if (result.latency.p99 < 1000) {
                console.log('   ⚠️ SLOW - Consider optimization');
            } else {
                console.log('   ❌ POOR - Needs immediate optimization');
            }

            resolve(result);
        });
    });
}

async function main() {
    console.log('🚀 GharBazaar API Load Testing');
    console.log('================================');
    console.log(`Target: ${BASE_URL}`);
    console.log(`Duration: ${DURATION}s per test\n`);

    try {
        require.resolve('autocannon');
    } catch (e) {
        console.error('❌ autocannon is not installed.');
        console.error('   Install with: npm install -g autocannon');
        console.error('   Or: npm install -D autocannon');
        process.exit(1);
    }

    const results = [];

    for (const test of TESTS) {
        try {
            const result = await runTest(test);
            results.push({ name: test.name, result });
        } catch (error) {
            console.error(`❌ Test "${test.name}" failed:`, error.message);
        }
    }

    // Summary
    console.log('\n================================');
    console.log('📊 SUMMARY');
    console.log('================================');
    
    for (const { name, result } of results) {
        const status = result.latency.p99 < 500 ? '✅' : '⚠️';
        console.log(`${status} ${name}: ${result.requests.average.toFixed(0)} req/s, p99: ${result.latency.p99}ms`);
    }

    console.log('\n✅ All tests completed');
}

main().catch(console.error);
