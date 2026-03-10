import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '../utils/typesense';

async function testSearch() {
    const query = 'Startocaster';
    console.log(`Searching for: "${query}"...`);

    try {
        const results = await typesenseClient
            .collections(PRODUCTS_COLLECTION_NAME)
            .documents()
            .search({
                q: query,
                query_by: 'name,description'
            });

        console.log(`Found ${results.found} matches.`);
        results.hits?.forEach((hit: any, i: number) => {
            console.log(`${i + 1}. ${hit.document.name} (ID: ${hit.document.id})`);
        });
    } catch (error) {
        console.error('Search failed:', error);
    }
    process.exit(0);
}

testSearch();
