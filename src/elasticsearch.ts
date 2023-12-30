import { Client } from '@elastic/elasticsearch';

import { winstonLogger } from "@vmdt/9-jobber-shared";
import { Logger } from "winston";
import { config } from '@gateway/config';
import { ClusterHealthResponse } from '@elastic/elasticsearch/lib/api/types';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'gatewayElasticSearch', 'debug');

class ElasticSearch {
    private elasticSearchClient: Client;

    constructor() {
        this.elasticSearchClient = new Client({
            node: `${config.ELASTIC_SEARCH_URL}`
        });
    }

    public async checkConnection(): Promise<void> {
        let isConnected = false;
        while(!isConnected) {
            try {
                const health: ClusterHealthResponse = await this.elasticSearchClient.cluster.health({});
                log.info(`GatewayService connected to ElasticSearch - ${health.status}`);
                isConnected = true;
            } catch (error) {
                log.error('GatewayService connect to ElasticSearch failed. Retrying...');
                log.log('error', 'gatewayService checkConnection() method error:', error);
            }
        }
    }
}

export const elasticSearch: ElasticSearch = new ElasticSearch();