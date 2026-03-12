const fetch = require('node-fetch');

async function verifySuggestions() {
    const query = `
    query($query: String!) {
      searchSuggestions(query: $query)
    }
  `;
    const variables = { query: 'Strat' };

    try {
        const response = await fetch('http://localhost:4000/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables }),
        });
        const result = await response.json();
        console.log('Search Suggestions Result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
}

verifySuggestions();
