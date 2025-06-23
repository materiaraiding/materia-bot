const Cloudflare = require('cloudflare');

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.D1_AUTH;
const D1_DATABASE_ID = process.env.D1_DATABASE_ID;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!CLOUDFLARE_API_TOKEN) {
    throw new Error('CLOUDFLARE_API_TOKEN or D1_AUTH environment variable is not set');
}
if (!D1_DATABASE_ID) {
    throw new Error('D1_DATABASE_ID environment variable is not set');
}
if (!CLOUDFLARE_ACCOUNT_ID) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID environment variable is not set');
}

const client = new Cloudflare({
    apiToken: CLOUDFLARE_API_TOKEN,
});

async function d1Query(sql, params = []) {
    const results = [];
    for await (const queryResult of client.d1.database.query(D1_DATABASE_ID, {
        account_id: CLOUDFLARE_ACCOUNT_ID,
        sql,
        params,
    })) {
        results.push(queryResult);
    }
    return results;
}

module.exports = {
    d1Query,
};
