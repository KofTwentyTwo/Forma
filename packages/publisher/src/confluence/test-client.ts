/**
 * Quick test script for Confluence client
 * Run with: npx tsx packages/publisher/src/confluence/test-client.ts
 */

import { ConfluenceClient } from './client.js';

async function main() {
  const client = new ConfluenceClient({
    baseUrl: process.env.CONFLUENCE_BASE_URL!,
    email: process.env.CONFLUENCE_EMAIL!,
    apiToken: process.env.CONFLUENCE_API_TOKEN!,
  });

  const parentPageId = process.env.CONFLUENCE_PARENT_PAGE_ID!;
  const spaceKey = process.env.CONFLUENCE_SPACE_KEY!;

  console.log('Testing Confluence client...\n');

  // Test 1: Get parent page
  console.log('1. Getting parent page...');
  const parentPage = await client.getPage(parentPageId, ['version']);
  console.log(`   Found: "${parentPage.title}" (id: ${parentPage.id}, version: ${parentPage.version})\n`);

  // Test 2: Get children
  console.log('2. Getting child pages...');
  const children = await client.getChildren(parentPageId);
  console.log(`   Found ${children.length} children: ${children.map(c => c.title).join(', ') || '(none)'}\n`);

  // Test 3: Create a test page
  console.log('3. Creating test page...');
  const testPage = await client.createPage(
    spaceKey,
    parentPageId,
    'Forma Test Page',
    '<p>This is a test page created by Forma.</p>'
  );
  console.log(`   Created: "${testPage.title}" (id: ${testPage.id})\n`);

  // Test 4: Set content property
  console.log('4. Setting content property...');
  await client.setContentProperty(testPage.id, 'forma-repo-path', 'test/page.md');
  console.log('   Set forma-repo-path = "test/page.md"\n');

  // Test 5: Get content property
  console.log('5. Getting content property...');
  const prop = await client.getContentProperty(testPage.id, 'forma-repo-path');
  console.log(`   Got: ${prop?.key} = "${prop?.value}"\n`);

  // Test 6: Update page
  console.log('6. Updating test page...');
  const currentPage = await client.getPage(testPage.id, ['version']);
  await client.updatePage(
    testPage.id,
    'Forma Test Page (Updated)',
    '<p>This page was updated by Forma.</p><p>It works!</p>',
    currentPage.version!
  );
  console.log('   Updated successfully\n');

  // Test 7: Add labels
  console.log('7. Adding labels...');
  await client.addLabels(testPage.id, ['forma-test', 'auto-generated']);
  console.log('   Added labels: forma-test, auto-generated\n');

  console.log('All tests passed!');
  console.log(`\nTest page URL: ${process.env.CONFLUENCE_BASE_URL}/pages/${testPage.id}`);
  console.log('\nNote: You may want to delete the test page manually.');
}

main().catch(console.error);
