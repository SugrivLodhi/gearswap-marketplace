import { Client } from '@elastic/elasticsearch';
import { env } from './environment';

class ElasticsearchClient {
    public client: Client;

    constructor() {
        this.client = new Client({
            node: env.elasticsearchUrl,
        });
    }

    async connect(): Promise<void> {
        try {
            const health = await this.client.cluster.health();
            console.log('✅ Elasticsearch connected successfully:', health.status);
        } catch (error) {
            console.error('❌ Elasticsearch connection failed:', error);
            throw error;
        }
    }

    async createProductIndex(): Promise<void> {
        const indexName = 'products';

        try {
            const exists = await this.client.indices.exists({ index: indexName });

            if (!exists) {
                await this.client.indices.create({
                    index: indexName,
                    body: {
                        mappings: {
                            properties: {
                                id: { type: 'keyword' },
                                name: {
                                    type: 'text',
                                    analyzer: 'standard',
                                    fields: {
                                        keyword: { type: 'keyword' },
                                    },
                                },
                                description: { type: 'text' },
                                category: { type: 'keyword' },
                                sellerId: { type: 'keyword' },
                                variants: {
                                    type: 'nested',
                                    properties: {
                                        sku: { type: 'keyword' },
                                        price: { type: 'float' },
                                        stock: { type: 'integer' },
                                    },
                                },
                                minPrice: { type: 'float' },
                                maxPrice: { type: 'float' },
                                inStock: { type: 'boolean' },
                                createdAt: { type: 'date' },
                            },
                        },
                    },
                });
                console.log(`✅ Created Elasticsearch index: ${indexName}`);
            }
        } catch (error) {
            console.error('Error creating product index:', error);
            throw error;
        }
    }

    async close(): Promise<void> {
        await this.client.close();
        console.log('Elasticsearch connection closed');
    }
}

export const elasticsearch = new ElasticsearchClient();
