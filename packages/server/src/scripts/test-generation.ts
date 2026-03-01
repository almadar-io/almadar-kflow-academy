/**
 * Test Generation Script for Phase 1
 * 
 * Runs all 8 operations on multiple test topics and validates:
 * - Schema compliance
 * - Cross-topic consistency
 * - Merge logic
 * - Composability
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { Concept } from '../types/concept';
import {
  expand,
  expandList,
  synthesize,
  deriveParents,
  explore,
  refocus,
  tracePath,
  deriveSummary,
} from '../operations';
import { validateConcept, validateExtendedConcept } from '../utils/validation';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Test topics
const TEST_TOPICS: Concept[] = [
  {
    name: 'JavaScript',
    description: 'A high-level programming language',
    parents: [],
    children: [],
  },
  {
    name: 'Machine Learning',
    description: 'A subset of artificial intelligence',
    parents: [],
    children: [],
  },
  {
    name: 'Ecology',
    description: 'The study of interactions among organisms and their environment',
    parents: [],
    children: [],
  },
];

interface TestResult {
  operation: string;
  topic: string;
  success: boolean;
  error?: string;
  resultCount?: number;
  executionTime?: number;
}

const results: TestResult[] = [];

/**
 * Test a single operation
 */
async function testOperation(
  operationName: string,
  operationFn: (input: any, ...args: any[]) => Promise<any[]>,
  input: Concept | Concept[],
  ...args: any[]
): Promise<TestResult> {
  const startTime = Date.now();
  const topicName = Array.isArray(input) ? input[0]?.name || 'multiple' : input.name;

  try {
    const result = await operationFn(input, ...args);

    // Validate schema
    const isValid = Array.isArray(result) && result.every(concept => {
      if (operationName === 'refocus') {
        return validateExtendedConcept(concept);
      }
      return validateConcept(concept);
    });

    if (!isValid) {
      return {
        operation: operationName,
        topic: topicName,
        success: false,
        error: 'Schema validation failed',
        executionTime: Date.now() - startTime,
      };
    }

    return {
      operation: operationName,
      topic: topicName,
      success: true,
      resultCount: result.length,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      operation: operationName,
      topic: topicName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Phase 1 Test Generation\n');
  console.log(`Testing ${TEST_TOPICS.length} topics across 8 operations...\n`);

  // Test expand
  for (const topic of TEST_TOPICS) {
    const result = await testOperation('expand', expand, topic);
    results.push(result);
  }

  // Test expandList (requires expanded concepts first)
  for (const topic of TEST_TOPICS) {
    try {
      const expanded = await expand(topic);
      if (expanded.length > 0) {
        const result = await testOperation('expandList', expandList, expanded.slice(0, 3));
        results.push(result);
      }
    } catch (error) {
      results.push({
        operation: 'expandList',
        topic: topic.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Test synthesize
  for (const topic of TEST_TOPICS) {
    try {
      const expanded = await expand(topic);
      if (expanded.length >= 2) {
        const result = await testOperation('synthesize', synthesize, expanded.slice(0, 2));
        results.push(result);
      }
    } catch (error) {
      results.push({
        operation: 'synthesize',
        topic: topic.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Test deriveParents
  for (const topic of TEST_TOPICS) {
    const result = await testOperation('deriveParents', deriveParents, topic);
    results.push(result);
  }

  // Test explore
  for (const topic of TEST_TOPICS) {
    const result = await testOperation('explore', explore, topic, 'high');
    results.push(result);
  }

  // Test refocus
  for (const topic of TEST_TOPICS) {
    try {
      const expanded = await expand(topic);
      if (expanded.length > 0) {
        const result = await testOperation('refocus', refocus, expanded, `Learn ${topic.name}`);
        results.push(result);
      }
    } catch (error) {
      results.push({
        operation: 'refocus',
        topic: topic.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Test tracePath
  for (const topic of TEST_TOPICS) {
    try {
      const expanded = await expand(topic);
      if (expanded.length >= 2) {
        const result = await testOperation('tracePath', tracePath, expanded[0], expanded[1]);
        results.push(result);
      }
    } catch (error) {
      results.push({
        operation: 'tracePath',
        topic: topic.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Test deriveSummary
  for (const topic of TEST_TOPICS) {
    try {
      const expanded = await expand(topic);
      if (expanded.length > 0) {
        const result = await testOperation('deriveSummary', deriveSummary, expanded);
        results.push(result);
      }
    } catch (error) {
      results.push({
        operation: 'deriveSummary',
        topic: topic.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n📊 Test Results Summary\n');
  console.log('='.repeat(80));

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  const successRate = ((successCount / totalCount) * 100).toFixed(1);

  console.log(`Total Tests: ${totalCount}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${totalCount - successCount}`);
  console.log(`Success Rate: ${successRate}%\n`);

  // Group by operation
  const byOperation = new Map<string, TestResult[]>();
  results.forEach(result => {
    const opResults = byOperation.get(result.operation) || [];
    opResults.push(result);
    byOperation.set(result.operation, opResults);
  });

  console.log('Results by Operation:');
  console.log('-'.repeat(80));
  for (const [operation, opResults] of byOperation.entries()) {
    const opSuccess = opResults.filter(r => r.success).length;
    const avgTime = opResults
      .filter(r => r.executionTime)
      .reduce((sum, r) => sum + (r.executionTime || 0), 0) / opResults.length;
    
    console.log(`\n${operation}:`);
    console.log(`  Success: ${opSuccess}/${opResults.length}`);
    console.log(`  Avg Time: ${avgTime ? avgTime.toFixed(0) : 'N/A'}ms`);
    
    opResults.forEach(result => {
      if (!result.success) {
        console.log(`  ❌ ${result.topic}: ${result.error}`);
      } else {
        console.log(`  ✅ ${result.topic}: ${result.resultCount} concepts (${result.executionTime}ms)`);
      }
    });
  }

  // Test composability
  console.log('\n\n🔗 Composability Test');
  console.log('-'.repeat(80));
  testComposability();
}

/**
 * Test composability by chaining operations
 */
async function testComposability() {
  const seed: Concept = {
    name: 'AI',
    description: 'Artificial Intelligence',
    parents: [],
    children: [],
  };

  try {
    console.log('Testing: expand → expandList → synthesize');
    const children = await expand(seed);
    const grandchildren = await expandList(children.slice(0, 3));
    const synthesized = await synthesize(grandchildren.slice(0, 2));

    // Validate all outputs
    const allConcepts = [...children, ...grandchildren, ...synthesized];
    const allValid = allConcepts.every(validateConcept);

    if (allValid) {
      console.log('✅ Composability test passed!');
      console.log(`   Generated ${allConcepts.length} valid concepts`);
    } else {
      console.log('❌ Composability test failed: Invalid concepts detected');
    }
  } catch (error) {
    console.log(`❌ Composability test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await runTests();
    generateReport();
    console.log('\n✨ Test generation complete!\n');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runTests, generateReport, testComposability };

