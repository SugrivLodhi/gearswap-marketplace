const http = require('http');

const data = JSON.stringify({
    query: `
    query($query: String!) {
      searchSuggestions(query: $query)
    }
  `,
    variables: { query: 'Strat' }
});

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/graphql',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Response:', body);
        process.exit(0);
    });
});

req.on('error', error => {
    console.error('Error:', error);
    process.exit(1);
});

req.write(data);
req.end();
